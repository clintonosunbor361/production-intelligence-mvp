-- supabase/seed_rbac.sql
-- Idempotent script to seed RBAC permissions and roles for existing organizations

-- 1. Insert new global permissions
INSERT INTO public.permissions (name)
VALUES 
  ('manage_rates'),
  ('manage_tailors'),
  ('manage_production'),
  ('manage_qc'),
  ('manage_completion'),
  ('manage_tickets'),
  ('manage_items'),
  ('view_audit_logs')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Roles and Role Permissions for every existing Organization
DO $$
DECLARE
  org RECORD;
  v_admin_role_id UUID;
  v_acct_role_id UUID;
  v_prod_role_id UUID;
  v_qc_role_id UUID;
  v_comp_role_id UUID;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    
    -- Insert Roles (Admin, Accountant, Production, QC, Completion)
    INSERT INTO public.roles (organization_id, name) VALUES (org.id, 'Admin') ON CONFLICT (organization_id, name) DO NOTHING RETURNING id INTO v_admin_role_id;
    IF v_admin_role_id IS NULL THEN
      SELECT id INTO v_admin_role_id FROM public.roles WHERE organization_id = org.id AND name = 'Admin';
    END IF;

    -- Accountant
    INSERT INTO public.roles (organization_id, name) VALUES (org.id, 'Accountant') ON CONFLICT (organization_id, name) DO NOTHING RETURNING id INTO v_acct_role_id;
    IF v_acct_role_id IS NULL THEN
      SELECT id INTO v_acct_role_id FROM public.roles WHERE organization_id = org.id AND name = 'Accountant';
    END IF;

    -- Production
    INSERT INTO public.roles (organization_id, name) VALUES (org.id, 'Production') ON CONFLICT (organization_id, name) DO NOTHING RETURNING id INTO v_prod_role_id;
    IF v_prod_role_id IS NULL THEN
      SELECT id INTO v_prod_role_id FROM public.roles WHERE organization_id = org.id AND name = 'Production';
    END IF;

    -- QC
    INSERT INTO public.roles (organization_id, name) VALUES (org.id, 'QC') ON CONFLICT (organization_id, name) DO NOTHING RETURNING id INTO v_qc_role_id;
    IF v_qc_role_id IS NULL THEN
      SELECT id INTO v_qc_role_id FROM public.roles WHERE organization_id = org.id AND name = 'QC';
    END IF;

    -- Completion
    INSERT INTO public.roles (organization_id, name) VALUES (org.id, 'Completion') ON CONFLICT (organization_id, name) DO NOTHING RETURNING id INTO v_comp_role_id;
    IF v_comp_role_id IS NULL THEN
      SELECT id INTO v_comp_role_id FROM public.roles WHERE organization_id = org.id AND name = 'Completion';
    END IF;

    -- Attach ALL permissions to Admin explicitly
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Attach specific permissions
    -- Accountant: manage_rates, manage_tailors
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_acct_role_id, id FROM public.permissions WHERE name IN ('manage_rates', 'manage_tailors')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Production: manage_production
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_prod_role_id, id FROM public.permissions WHERE name IN ('manage_production')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- QC: manage_qc
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_qc_role_id, id FROM public.permissions WHERE name IN ('manage_qc')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Completion: manage_completion
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_comp_role_id, id FROM public.permissions WHERE name IN ('manage_completion')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

  END LOOP;
END
$$;
