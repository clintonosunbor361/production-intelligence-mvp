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