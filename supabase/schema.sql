-- schema.sql (UPDATED / PRODUCTION-SAFE FOR THE LOCKED SPINE)
-- Includes:
-- - Multi-tenant (organization_id everywhere)
-- - WorkAssignment financial unit + unique constraint
-- - Snapshot fields (band, rate, pay_amount) stored (NOT generated)
-- - State machine statuses (incl QC_FAILED + REVERSED)
-- - QC_FAILED requires notes (DB CHECK)
-- - Payments + payment_batches + reversal ledger
-- - Audit logs include organization_id
-- - updated_at auto-maintained
-- - Basic immutability guard for snapshot fields + PAID protection (DB trigger)

-- =========================
-- Extensions
-- =========================
create extension if not exists "pgcrypto";

-- =========================
-- Enums
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_assignment_status') THEN
    CREATE TYPE work_assignment_status AS ENUM ('CREATED', 'QC_PASSED', 'QC_FAILED', 'PAID', 'REVERSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tailor_band') THEN
    CREATE TYPE tailor_band AS ENUM ('A', 'B');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status') THEN
    CREATE TYPE item_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
    CREATE TYPE payment_type AS ENUM ('PAY', 'REVERSAL');
  END IF;
END $$;

-- =========================
-- Core: Organizations (+ optional branches)
-- =========================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Branches (nullable usage for now; multi-tenant ready)
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(organization_id);

-- =========================
-- Roles & Permissions
-- =========================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- One role per user per organization
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- =========================
-- Operational: Tickets / Items
-- =========================
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
  ticket_number text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ticket_number)
);

CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, -- ticket cancel cascades to items by deleting, or by status changes via RPC
  product_type_id uuid NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
  item_key text NOT NULL,
  status item_status NOT NULL DEFAULT 'IN_PROGRESS',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_branch ON tickets(branch_id);
CREATE INDEX IF NOT EXISTS idx_items_org ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_ticket ON items(ticket_id);

-- =========================
-- Master data: Task Types / Tailors / Rate Cards
-- =========================
CREATE TABLE IF NOT EXISTS task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS tailors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  band tailor_band NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Rate card stores band A and band B fee per (task_type, product_type)
CREATE TABLE IF NOT EXISTS rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_type_id uuid NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
  product_type_id uuid NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
  band_a_fee numeric(12,2) NOT NULL CHECK (band_a_fee >= 0),
  band_b_fee numeric(12,2) NOT NULL CHECK (band_b_fee >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, task_type_id, product_type_id)
);

CREATE INDEX IF NOT EXISTS idx_task_types_org ON task_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_tailors_org ON tailors(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_org ON rate_cards(organization_id);

-- =========================
-- Financial Unit: Work Assignments
-- =========================
CREATE TABLE IF NOT EXISTS work_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  task_type_id uuid NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
  tailor_id uuid NOT NULL REFERENCES tailors(id) ON DELETE RESTRICT,

  status work_assignment_status NOT NULL DEFAULT 'CREATED',

  -- Snapshots at creation time (IMMUTABLE after insert)
  pay_band_snapshot tailor_band NOT NULL,
  rate_snapshot numeric(12,2) NOT NULL CHECK (rate_snapshot >= 0),
  pay_amount numeric(12,2) NOT NULL CHECK (pay_amount >= 0),

  qc_notes text,
  reversal_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Crucial business rule:
  -- (organization_id, item_id, task_type_id, tailor_id) must be unique
  UNIQUE (organization_id, item_id, task_type_id, tailor_id),

  -- QC_FAILED requires notes
  CONSTRAINT qc_failed_requires_notes CHECK (
    status <> 'QC_FAILED'
    OR (qc_notes IS NOT NULL AND length(trim(qc_notes)) > 0)
  ),

  -- REVERSED requires reason
  CONSTRAINT reversed_requires_reason CHECK (
    status <> 'REVERSED'
    OR (reversal_reason IS NOT NULL AND length(trim(reversal_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_work_assignments_org ON work_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_item ON work_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_tailor ON work_assignments(tailor_id);

-- =========================
-- Payments (ledger) + batches
-- =========================
CREATE TABLE IF NOT EXISTS payment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_ref text NOT NULL,
  paid_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (organization_id, batch_ref)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_assignment_id uuid NOT NULL REFERENCES work_assignments(id) ON DELETE RESTRICT,
  batch_id uuid NULL REFERENCES payment_batches(id) ON DELETE SET NULL,

  type payment_type NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  -- For REVERSAL rows: which PAY row is being reversed
  reverses_payment_id uuid NULL REFERENCES payments(id) ON DELETE RESTRICT,
  reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  CONSTRAINT reversal_requires_target CHECK (
    type <> 'REVERSAL'
    OR reverses_payment_id IS NOT NULL
  ),

  CONSTRAINT pay_cannot_reference_target CHECK (
    type <> 'PAY'
    OR reverses_payment_id IS NULL
  )
);

-- Prevent multiple PAY rows for the same WorkAssignment (enforce “pay once”; reversal is separate row)
CREATE UNIQUE INDEX IF NOT EXISTS ux_pay_once_per_assignment
ON payments (organization_id, work_assignment_id)
WHERE type = 'PAY';

CREATE INDEX IF NOT EXISTS idx_payment_batches_org ON payment_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_assignment ON payments(work_assignment_id);

-- =========================
-- Audit Logging (must be org-scoped)
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);

-- =========================
-- updated_at triggers (generic)
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_items_updated_at ON public.items;
CREATE TRIGGER trg_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_rate_cards_updated_at ON public.rate_cards;
CREATE TRIGGER trg_rate_cards_updated_at
BEFORE UPDATE ON public.rate_cards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_work_assignments_updated_at ON public.work_assignments;
CREATE TRIGGER trg_work_assignments_updated_at
BEFORE UPDATE ON public.work_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Immutability guards (DB-side, minimal but critical)
-- 1) Snapshots cannot change after insert
-- 2) After PAID, no changes allowed except moving to REVERSED (via reversal workflow)
-- =========================
CREATE OR REPLACE FUNCTION public.enforce_work_assignment_invariants()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_work_assignments_invariants ON public.work_assignments;
CREATE TRIGGER trg_work_assignments_invariants
BEFORE UPDATE ON public.work_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_work_assignment_invariants();