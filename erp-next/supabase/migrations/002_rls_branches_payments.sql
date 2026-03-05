-- Enable Row Level Security (RLS) on the tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "branches_select_org" ON public.branches;
DROP POLICY IF EXISTS "branches_insert_manage_rates" ON public.branches;
DROP POLICY IF EXISTS "branches_update_manage_rates" ON public.branches;

DROP POLICY IF EXISTS "payment_batches_select_org" ON public.payment_batches;
DROP POLICY IF EXISTS "payment_batches_insert_manage_rates" ON public.payment_batches;
DROP POLICY IF EXISTS "payment_batches_update_manage_rates" ON public.payment_batches;

DROP POLICY IF EXISTS "payments_select_org" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_manage_rates" ON public.payments;
DROP POLICY IF EXISTS "payments_update_manage_rates" ON public.payments;

-- SELECT policies (read access for users in the organization)
CREATE POLICY "branches_select_org" 
ON public.branches 
FOR SELECT 
USING (organization_id = public.current_org_id());

CREATE POLICY "payment_batches_select_org" 
ON public.payment_batches 
FOR SELECT 
USING (organization_id = public.current_org_id());

CREATE POLICY "payments_select_org" 
ON public.payments 
FOR SELECT 
USING (organization_id = public.current_org_id());

-- INSERT policies (write access restricted to manage_rates)
CREATE POLICY "branches_insert_manage_rates" 
ON public.branches 
FOR INSERT 
WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
);

CREATE POLICY "payment_batches_insert_manage_rates" 
ON public.payment_batches 
FOR INSERT 
WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
);

CREATE POLICY "payments_insert_manage_rates" 
ON public.payments 
FOR INSERT 
WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
);

-- UPDATE policies (update access restricted to manage_rates)
CREATE POLICY "branches_update_manage_rates" 
ON public.branches 
FOR UPDATE 
USING (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
)
WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
);

CREATE POLICY "payment_batches_update_manage_rates" 
ON public.payment_batches 
FOR UPDATE 
USING (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
)
WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
);

CREATE POLICY "payments_update_manage_rates" 
ON public.payments 
FOR UPDATE 
USING (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
)
WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.has_permission('manage_rates')
);
