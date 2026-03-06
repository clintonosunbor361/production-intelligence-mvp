-- 1. Add new enum values (Must be executed outside of a transaction if using older PG, but Supabase handles this fine in separate statements)
ALTER TYPE item_status ADD VALUE IF NOT EXISTS 'IN_PRODUCTION' BEFORE 'IN_PROGRESS';
ALTER TYPE item_status ADD VALUE IF NOT EXISTS 'IN_QC' BEFORE 'COMPLETED';

-- 2. Update existing data to use the new status instead of IN_PROGRESS
UPDATE items 
SET status = 'IN_PRODUCTION' 
WHERE status = 'IN_PROGRESS';

-- 3. Update the default value for the status column
ALTER TABLE items ALTER COLUMN status SET DEFAULT 'IN_PRODUCTION'::item_status;

-- Note: Removing 'IN_PROGRESS' from the enum requires recreating the type or modifying the pg_enum catalog directly. 
-- It is safest to just leave the old value in the enum, but no longer use it in the app.
