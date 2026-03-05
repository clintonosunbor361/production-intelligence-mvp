-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    before jsonb,
    after jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Define current_org_id function
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Define has_permission function for RLS writes
CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean AS $$
DECLARE
  v_org_id uuid;
  v_role_id uuid;
  v_has_perm boolean;
BEGIN
  -- get current user org
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_org_id IS NULL THEN RETURN false; END IF;
  
  -- get user role in org
  SELECT role_id INTO v_role_id FROM public.user_roles WHERE user_id = auth.uid() AND organization_id = v_org_id LIMIT 1;
  IF v_role_id IS NULL THEN RETURN false; END IF;

  -- check if role has permission
  SELECT EXISTS(
    SELECT 1 FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = v_role_id AND p.name = p_permission
  ) INTO v_has_perm;

  RETURN v_has_perm;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Enable RLS on all tenant tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_special_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Tenant isolation for SELECT policies
CREATE POLICY "Tenant isolation for SELECT on tickets" ON public.tickets FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on items" ON public.items FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on product_types" ON public.product_types FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on category_types" ON public.category_types FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on task_types" ON public.task_types FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on rate_cards" ON public.rate_cards FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on tailors" ON public.tailors FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on tailor_special_pay" ON public.tailor_special_pay FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on work_assignments" ON public.work_assignments FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Tenant isolation for SELECT on user_roles" ON public.user_roles FOR SELECT USING (organization_id = current_org_id());

-- Users need to read their own profile OR profiles in their org
CREATE POLICY "Tenant isolation for SELECT on profiles" ON public.profiles FOR SELECT USING (organization_id = current_org_id() OR user_id = auth.uid());

-- 6. WRITE POLICIES
CREATE POLICY "Write tickets" ON public.tickets FOR INSERT WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_production'));
CREATE POLICY "Update tickets" ON public.tickets FOR UPDATE USING (organization_id = current_org_id() AND public.has_permission('manage_production')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_production'));
CREATE POLICY "Delete tickets" ON public.tickets FOR DELETE USING (organization_id = current_org_id() AND public.has_permission('manage_production'));

CREATE POLICY "Write items" ON public.items FOR INSERT WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_production'));
CREATE POLICY "Update items" ON public.items FOR UPDATE USING (organization_id = current_org_id() AND public.has_permission('manage_production')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_production'));
CREATE POLICY "Delete items" ON public.items FOR DELETE USING (organization_id = current_org_id() AND public.has_permission('manage_production'));

CREATE POLICY "Write product_types" ON public.product_types FOR ALL USING (organization_id = current_org_id() AND public.has_permission('manage_rates')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_rates'));
CREATE POLICY "Write category_types" ON public.category_types FOR ALL USING (organization_id = current_org_id() AND public.has_permission('manage_rates')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_rates'));
CREATE POLICY "Write task_types" ON public.task_types FOR ALL USING (organization_id = current_org_id() AND public.has_permission('manage_rates')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_rates'));
CREATE POLICY "Write rate_cards" ON public.rate_cards FOR ALL USING (organization_id = current_org_id() AND public.has_permission('manage_rates')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_rates'));

CREATE POLICY "Write tailors" ON public.tailors FOR ALL USING (organization_id = current_org_id() AND public.has_permission('manage_tailors')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_tailors'));
CREATE POLICY "Write tailor_special_pay" ON public.tailor_special_pay FOR ALL USING (organization_id = current_org_id() AND public.has_permission('manage_tailors')) WITH CHECK (organization_id = current_org_id() AND public.has_permission('manage_tailors'));

CREATE POLICY "Write work_assignments" ON public.work_assignments FOR ALL USING (
  organization_id = current_org_id() AND 
  (public.has_permission('manage_production') OR public.has_permission('manage_qc') OR public.has_permission('manage_completion'))
) WITH CHECK (
  organization_id = current_org_id() AND 
  (public.has_permission('manage_production') OR public.has_permission('manage_qc') OR public.has_permission('manage_completion'))
);


-- 7. Audit log triggers
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
  ELSE
    v_org_id := NEW.organization_id;
  END IF;

  INSERT INTO public.audit_logs (
    organization_id, actor_user_id, action, table_name, record_id, before, after
  ) VALUES (
    v_org_id,
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE null END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE null END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_tickets AFTER INSERT OR UPDATE OR DELETE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_items AFTER INSERT OR UPDATE OR DELETE ON public.items FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_tailors AFTER INSERT OR UPDATE OR DELETE ON public.tailors FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_work_assignments AFTER INSERT OR UPDATE OR DELETE ON public.work_assignments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_rate_cards AFTER INSERT OR UPDATE OR DELETE ON public.rate_cards FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
