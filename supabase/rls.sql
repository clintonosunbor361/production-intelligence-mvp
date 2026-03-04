-- rls.sql (PRODUCTION-SAFE, NO auth schema writes)
-- Assumes tables exist: organizations, roles, permissions, role_permissions, user_roles,
-- tickets, items, product_types, task_types, tailors, rate_cards, work_assignments, audit_logs
-- Adjust table names if your schema differs.

-- =========================
-- 1) Enable RLS (explicit tables only)
-- =========================
ALTER TABLE public.organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_cards       ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;

-- =========================
-- 2) Recursion-breaker policies (MUST exist before helper functions are used in other policies)
-- =========================

-- Allow a user to read only their own membership rows
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Allow reading permissions list (often global dictionary)
DROP POLICY IF EXISTS permissions_select_all ON public.permissions;
CREATE POLICY permissions_select_all
ON public.permissions
FOR SELECT
USING (true);

-- =========================
-- 3) Helper functions (public)
-- =========================

-- Current org for this user (one role per user per org row)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ur.organization_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- Permission check scoped to the current org
CREATE OR REPLACE FUNCTION public.has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = public.current_org_id()
      AND p.name = required_permission
  );
$$;

-- =========================
-- 4) Org-scoped SELECT policies (read)
-- =========================

DROP POLICY IF EXISTS organizations_select_own ON public.organizations;
CREATE POLICY organizations_select_own
ON public.organizations
FOR SELECT
USING (id = public.current_org_id());

DROP POLICY IF EXISTS roles_select_org ON public.roles;
CREATE POLICY roles_select_org
ON public.roles
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS role_permissions_select_org ON public.role_permissions;
CREATE POLICY role_permissions_select_org
ON public.role_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND r.organization_id = public.current_org_id()
  )
);

DROP POLICY IF EXISTS tickets_select_org ON public.tickets;
CREATE POLICY tickets_select_org
ON public.tickets
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS items_select_org ON public.items;
CREATE POLICY items_select_org
ON public.items
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS product_types_select_org ON public.product_types;
CREATE POLICY product_types_select_org
ON public.product_types
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS task_types_select_org ON public.task_types;
CREATE POLICY task_types_select_org
ON public.task_types
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS tailors_select_org ON public.tailors;
CREATE POLICY tailors_select_org
ON public.tailors
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS rate_cards_select_org ON public.rate_cards;
CREATE POLICY rate_cards_select_org
ON public.rate_cards
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS work_assignments_select_org ON public.work_assignments;
CREATE POLICY work_assignments_select_org
ON public.work_assignments
FOR SELECT
USING (organization_id = public.current_org_id());

-- Rate Cards / Master Data Manage
DROP POLICY IF EXISTS rate_cards_insert_manage ON public.rate_cards;
CREATE POLICY rate_cards_insert_manage
ON public.rate_cards
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS rate_cards_update_manage ON public.rate_cards;
CREATE POLICY rate_cards_update_manage
ON public.rate_cards
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS rate_cards_delete_manage ON public.rate_cards;
CREATE POLICY rate_cards_delete_manage
ON public.rate_cards
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

-- Tailors Manage
DROP POLICY IF EXISTS tailors_insert_manage ON public.tailors;
CREATE POLICY tailors_insert_manage
ON public.tailors
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_tailors'));

DROP POLICY IF EXISTS tailors_update_manage ON public.tailors;
CREATE POLICY tailors_update_manage
ON public.tailors
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_tailors'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_tailors'));

DROP POLICY IF EXISTS tailors_delete_manage ON public.tailors;
CREATE POLICY tailors_delete_manage
ON public.tailors
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_tailors'));

-- Product Types Manage
DROP POLICY IF EXISTS product_types_insert_manage ON public.product_types;
CREATE POLICY product_types_insert_manage
ON public.product_types
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS product_types_update_manage ON public.product_types;
CREATE POLICY product_types_update_manage
ON public.product_types
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS product_types_delete_manage ON public.product_types;
CREATE POLICY product_types_delete_manage
ON public.product_types
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

-- Task Types Manage
DROP POLICY IF EXISTS task_types_insert_manage ON public.task_types;
CREATE POLICY task_types_insert_manage
ON public.task_types
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS task_types_update_manage ON public.task_types;
CREATE POLICY task_types_update_manage
ON public.task_types
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS task_types_delete_manage ON public.task_types;
CREATE POLICY task_types_delete_manage
ON public.task_types
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

-- Category Types Manage
ALTER TABLE public.category_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS category_types_select_org ON public.category_types;
CREATE POLICY category_types_select_org
ON public.category_types
FOR SELECT
USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS category_types_insert_manage ON public.category_types;
CREATE POLICY category_types_insert_manage
ON public.category_types
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS category_types_update_manage ON public.category_types;
CREATE POLICY category_types_update_manage
ON public.category_types
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

DROP POLICY IF EXISTS category_types_delete_manage ON public.category_types;
CREATE POLICY category_types_delete_manage
ON public.category_types
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_rates'));

-- =========================
-- 5) Controlled writes for operational tables (tickets/items) behind permissions
-- =========================

-- Tickets manage
DROP POLICY IF EXISTS tickets_insert_manage ON public.tickets;
CREATE POLICY tickets_insert_manage
ON public.tickets
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_tickets'));

DROP POLICY IF EXISTS tickets_update_manage ON public.tickets;
CREATE POLICY tickets_update_manage
ON public.tickets
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_tickets'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_tickets'));

DROP POLICY IF EXISTS tickets_delete_manage ON public.tickets;
CREATE POLICY tickets_delete_manage
ON public.tickets
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_tickets'));

-- Items manage
DROP POLICY IF EXISTS items_insert_manage ON public.items;
CREATE POLICY items_insert_manage
ON public.items
FOR INSERT
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_items'));

DROP POLICY IF EXISTS items_update_manage ON public.items;
CREATE POLICY items_update_manage
ON public.items
FOR UPDATE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_items'))
WITH CHECK (organization_id = public.current_org_id() AND public.has_permission('manage_items'));

DROP POLICY IF EXISTS items_delete_manage ON public.items;
CREATE POLICY items_delete_manage
ON public.items
FOR DELETE
USING (organization_id = public.current_org_id() AND public.has_permission('manage_items'));

-- =========================
-- 6) Financial + audit tables: NO direct client writes
-- =========================
-- Intentionally no INSERT/UPDATE/DELETE policies on work_assignments or audit_logs.
-- Only SECURITY DEFINER RPC + triggers should write them.

DROP POLICY IF EXISTS audit_logs_select_admin_org ON public.audit_logs;
CREATE POLICY audit_logs_select_admin_org
ON public.audit_logs
FOR SELECT
USING (
  organization_id = public.current_org_id()
  AND public.has_permission('view_audit_logs')
);