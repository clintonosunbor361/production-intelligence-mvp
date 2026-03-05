-- Migration 003: Fix Function Search Path Mutable warnings safely

-- 1. has_permission
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- 2. set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- 3. enforce_work_assignment_invariants
CREATE OR REPLACE FUNCTION public.enforce_work_assignment_invariants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Snapshot immutability
  IF TG_OP = 'UPDATE' THEN
    IF NEW.pay_band_snapshot IS DISTINCT FROM OLD.pay_band_snapshot
       OR NEW.rate_snapshot IS DISTINCT FROM OLD.rate_snapshot
       OR NEW.pay_amount IS DISTINCT FROM OLD.pay_amount THEN
      RAISE EXCEPTION 'Snapshot fields are immutable on work_assignments';
    END IF;
  END IF;

  -- After PAID: block edits unless status moves to REVERSED
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'PAID' AND NEW.status <> 'REVERSED' THEN
      RAISE EXCEPTION 'Cannot modify a PAID work_assignment except via reversal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- 4. jsonb_diff
CREATE OR REPLACE FUNCTION public.jsonb_diff(old_row JSONB, new_row JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT jsonb_object_agg(key, value)
    FROM (
        -- Added or changed keys
        SELECT n.key, n.value
        FROM jsonb_each(new_row) n
        WHERE old_row -> n.key IS DISTINCT FROM n.value
        
        UNION
        
        -- Removed keys
        SELECT o.key, NULL
        FROM jsonb_each(old_row) o
        WHERE NOT new_row ? o.key
    ) s;
$$;


-- 5. generate_item_key
ALTER FUNCTION public.generate_item_key SET search_path = public;
