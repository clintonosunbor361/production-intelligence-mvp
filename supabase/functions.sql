-- functions.sql
-- functions.sql (UPDATED to match schema + RLS helpers)
-- Requires: public.current_org_id(), public.has_permission()

-- Helper: ticket completion
CREATE OR REPLACE FUNCTION public.check_ticket_completion(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
BEGIN
  -- Close ticket if no IN_PROGRESS items remain
  IF NOT EXISTS (
    SELECT 1
    FROM public.items
    WHERE ticket_id = p_ticket_id
      AND organization_id = v_org_id
      AND status = 'IN_PROGRESS'
  ) THEN
    UPDATE public.tickets
    SET status = 'CLOSED'
    WHERE id = p_ticket_id
      AND organization_id = v_org_id
      AND status = 'OPEN';
  ELSE
    UPDATE public.tickets
    SET status = 'OPEN'
    WHERE id = p_ticket_id
      AND organization_id = v_org_id
      AND status = 'CLOSED';
  END IF;
END;
$$;

-- 1) Create Work Assignment (computes snapshots)
CREATE OR REPLACE FUNCTION public.create_work_assignment(
  p_item_id uuid,
  p_task_type_id uuid,
  p_tailor_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_product_type_id uuid;
  v_band tailor_band;
  v_rate numeric(12,2);
  v_assignment_id uuid;
  v_item_status item_status;
BEGIN
  IF NOT public.has_permission('manage_work_assignments') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT product_type_id, status
  INTO v_product_type_id, v_item_status
  FROM public.items
  WHERE id = p_item_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_item_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot assign work on a cancelled item';
  END IF;

  SELECT band
  INTO v_band
  FROM public.tailors
  WHERE id = p_tailor_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tailor not found';
  END IF;

  -- Fetch rate from rate_cards depending on band
  IF v_band = 'A' THEN
    SELECT band_a_fee INTO v_rate
    FROM public.rate_cards
    WHERE organization_id = v_org_id
      AND task_type_id = p_task_type_id
      AND product_type_id = v_product_type_id;
  ELSE
    SELECT band_b_fee INTO v_rate
    FROM public.rate_cards
    WHERE organization_id = v_org_id
      AND task_type_id = p_task_type_id
      AND product_type_id = v_product_type_id;
  END IF;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Rate card not found for this task and product';
  END IF;

  INSERT INTO public.work_assignments (
    organization_id,
    item_id,
    task_type_id,
    tailor_id,
    status,
    pay_band_snapshot,
    rate_snapshot,
    pay_amount
  ) VALUES (
    v_org_id,
    p_item_id,
    p_task_type_id,
    p_tailor_id,
    'CREATED',
    v_band,
    v_rate,
    v_rate
  )
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- 2) QC Pass
CREATE OR REPLACE FUNCTION public.qc_pass(
  p_assignment_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_status work_assignment_status;
BEGIN
  IF NOT public.has_permission('manage_qc') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT status
  INTO v_status
  FROM public.work_assignments
  WHERE id = p_assignment_id AND organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work assignment not found';
  END IF;

  IF v_status NOT IN ('CREATED','QC_FAILED') THEN
    RAISE EXCEPTION 'Must be CREATED or QC_FAILED to pass QC';
  END IF;

  UPDATE public.work_assignments
  SET status = 'QC_PASSED'
  WHERE id = p_assignment_id AND organization_id = v_org_id;
END;
$$;

-- 3) QC Fail (notes required)
CREATE OR REPLACE FUNCTION public.qc_fail(
  p_assignment_id uuid,
  p_notes text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_status work_assignment_status;
BEGIN
  IF NOT public.has_permission('manage_qc') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_notes IS NULL OR length(trim(p_notes)) = 0 THEN
    RAISE EXCEPTION 'QC fail requires notes';
  END IF;

  SELECT status
  INTO v_status
  FROM public.work_assignments
  WHERE id = p_assignment_id AND organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work assignment not found';
  END IF;

  IF v_status <> 'CREATED' THEN
    RAISE EXCEPTION 'Must be CREATED to fail QC';
  END IF;

  UPDATE public.work_assignments
  SET status = 'QC_FAILED',
      qc_notes = p_notes
  WHERE id = p_assignment_id AND organization_id = v_org_id;
END;
$$;

-- 4) Create Payment Batch (writes payment ledger + marks assignments PAID)
CREATE OR REPLACE FUNCTION public.create_payment_batch(
  p_assignment_ids uuid[],
  p_batch_ref text,
  p_paid_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_batch_id uuid;
  v_id uuid;
  v_status work_assignment_status;
  v_amount numeric(12,2);
BEGIN
  IF NOT public.has_permission('manage_payments') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_batch_ref IS NULL OR length(trim(p_batch_ref)) = 0 THEN
    RAISE EXCEPTION 'batch_ref is required';
  END IF;

  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at is required';
  END IF;

  INSERT INTO public.payment_batches (organization_id, batch_ref, paid_at, created_by)
  VALUES (v_org_id, p_batch_ref, p_paid_at, auth.uid())
  RETURNING id INTO v_batch_id;

  FOREACH v_id IN ARRAY p_assignment_ids
  LOOP
    SELECT status, pay_amount
    INTO v_status, v_amount
    FROM public.work_assignments
    WHERE id = v_id AND organization_id = v_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Work assignment % not found', v_id;
    END IF;

    IF v_status <> 'QC_PASSED' THEN
      RAISE EXCEPTION 'Work assignment % is not QC_PASSED', v_id;
    END IF;

    -- Insert PAY ledger row (unique index prevents double pay)
    INSERT INTO public.payments (
      organization_id,
      work_assignment_id,
      batch_id,
      type,
      amount,
      created_by
    ) VALUES (
      v_org_id,
      v_id,
      v_batch_id,
      'PAY',
      v_amount,
      auth.uid()
    );

    UPDATE public.work_assignments
    SET status = 'PAID'
    WHERE id = v_id AND organization_id = v_org_id;
  END LOOP;

  RETURN v_batch_id;
END;
$$;

-- 5) Reverse Payment (admin only): create REVERSAL ledger row + mark assignment REVERSED
CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_assignment_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_status work_assignment_status;
  v_pay_id uuid;
  v_amount numeric(12,2);
BEGIN
  IF NOT public.has_permission('admin') THEN
    RAISE EXCEPTION 'Permission denied: Admin only';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reversal requires a reason';
  END IF;

  SELECT status, pay_amount
  INTO v_status, v_amount
  FROM public.work_assignments
  WHERE id = p_assignment_id AND organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work assignment not found';
  END IF;

  IF v_status <> 'PAID' THEN
    RAISE EXCEPTION 'Only PAID assignments can be reversed';
  END IF;

  -- Find the PAY row
  SELECT id
  INTO v_pay_id
  FROM public.payments
  WHERE organization_id = v_org_id
    AND work_assignment_id = p_assignment_id
    AND type = 'PAY'
  LIMIT 1;

  IF v_pay_id IS NULL THEN
    RAISE EXCEPTION 'PAY ledger row not found for assignment';
  END IF;

  -- Insert REVERSAL row
  INSERT INTO public.payments (
    organization_id,
    work_assignment_id,
    type,
    amount,
    reverses_payment_id,
    reason,
    created_by
  ) VALUES (
    v_org_id,
    p_assignment_id,
    'REVERSAL',
    v_amount,
    v_pay_id,
    p_reason,
    auth.uid()
  );

  UPDATE public.work_assignments
  SET status = 'REVERSED',
      reversal_reason = p_reason
  WHERE id = p_assignment_id AND organization_id = v_org_id;
END;
$$;

-- 6) Cancel Item (does not affect sibling items)
CREATE OR REPLACE FUNCTION public.cancel_item(
  p_item_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_ticket_id uuid;
BEGIN
  IF NOT public.has_permission('manage_items') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT ticket_id
  INTO v_ticket_id
  FROM public.items
  WHERE id = p_item_id AND organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  UPDATE public.items
  SET status = 'CANCELLED'
  WHERE id = p_item_id AND organization_id = v_org_id;

  PERFORM public.check_ticket_completion(v_ticket_id);
END;
$$;

-- 7) Cancel Ticket (ADMIN only) + cascade items
CREATE OR REPLACE FUNCTION public.cancel_ticket(
  p_ticket_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
BEGIN
  IF NOT public.has_permission('admin') THEN
    RAISE EXCEPTION 'Permission denied: Admin only';
  END IF;

  UPDATE public.tickets
  SET status = 'CANCELLED'
  WHERE id = p_ticket_id AND organization_id = v_org_id;

  UPDATE public.items
  SET status = 'CANCELLED'
  WHERE ticket_id = p_ticket_id AND organization_id = v_org_id;

  -- Optional: also QC_FAIL any non-paid assignments under cancelled items (no CANCELLED state in enum)
  UPDATE public.work_assignments wa
  SET status = 'QC_FAILED',
      qc_notes = COALESCE(wa.qc_notes, 'Ticket cancelled (admin)'),
      updated_at = wa.updated_at
  WHERE wa.organization_id = v_org_id
    AND wa.status IN ('CREATED','QC_PASSED')
    AND wa.item_id IN (
      SELECT i.id FROM public.items i
      WHERE i.ticket_id = p_ticket_id AND i.organization_id = v_org_id
    );
END;
$$;

-- 8) Complete Item (manual completion; closes ticket if last open item)
CREATE OR REPLACE FUNCTION public.complete_item(
  p_item_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_org_id();
  v_ticket_id uuid;
BEGIN
  IF NOT public.has_permission('manage_items') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT ticket_id
  INTO v_ticket_id
  FROM public.items
  WHERE id = p_item_id AND organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  UPDATE public.items
  SET status = 'COMPLETED'
  WHERE id = p_item_id AND organization_id = v_org_id;

  PERFORM public.check_ticket_completion(v_ticket_id);
END;
$$;