-- triggers.sql
-- JSONB Diff (detects added + changed + removed keys)
CREATE OR REPLACE FUNCTION public.jsonb_diff(old_row JSONB, new_row JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
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


CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_changes JSONB;
BEGIN

    -- Prevent recursion
    IF TG_TABLE_NAME = 'audit_logs' THEN
        RETURN NULL;
    END IF;

    -- Identify organization safely
    IF TG_OP = 'DELETE' THEN
        v_org_id := OLD.organization_id;
    ELSE
        v_org_id := NEW.organization_id;
    END IF;

    IF TG_OP = 'INSERT' THEN

        INSERT INTO public.audit_logs (
            organization_id,
            table_name,
            record_id,
            action,
            new_data,
            changed_by
        )
        VALUES (
            v_org_id,
            TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            to_jsonb(NEW),
            v_user_id
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN

        v_changes := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));

        IF v_changes IS NOT NULL AND v_changes <> '{}'::jsonb THEN
            INSERT INTO public.audit_logs (
                organization_id,
                table_name,
                record_id,
                action,
                old_data,
                new_data,
                changed_by
            )
            VALUES (
                v_org_id,
                TG_TABLE_NAME,
                NEW.id,
                'UPDATE',
                to_jsonb(OLD),
                v_changes,
                v_user_id
            );
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        INSERT INTO public.audit_logs (
            organization_id,
            table_name,
            record_id,
            action,
            old_data,
            changed_by
        )
        VALUES (
            v_org_id,
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            v_user_id
        );

        RETURN OLD;

    END IF;

    RETURN NULL;
END;
$$;

-- Trigger logic for generating item_key and item_no
CREATE OR REPLACE FUNCTION public.set_item_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket_number text;
    v_next_no integer;
BEGIN
    IF NEW.item_key IS NULL OR NEW.item_no IS NULL THEN
        -- Get the ticket number
        SELECT ticket_number INTO v_ticket_number
        FROM public.tickets
        WHERE id = NEW.ticket_id AND organization_id = NEW.organization_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Ticket not found for the given organization.';
        END IF;

        -- Get the next item_no
        SELECT COALESCE(MAX(item_no), 0) + 1 INTO v_next_no
        FROM public.items
        WHERE ticket_id = NEW.ticket_id AND organization_id = NEW.organization_id;

        NEW.item_no := v_next_no;
        NEW.item_key := v_ticket_number || '-' || v_next_no::text;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_set_key ON public.items;
CREATE TRIGGER trg_items_set_key
    BEFORE INSERT ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_item_key();