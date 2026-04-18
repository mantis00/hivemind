


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."approve_org_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
  v_org_id  uuid;
BEGIN
  -- Guard: caller must be superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_superadmin = true
  ) THEN
    RAISE EXCEPTION 'Only superadmins can approve org requests';
  END IF;

  -- Fetch the pending request
  SELECT * INTO v_request
  FROM public.org_requests
  WHERE request_id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Create the org
  INSERT INTO public.orgs (name)
  VALUES (v_request.org_name)
  RETURNING org_id INTO v_org_id;

  -- Add requester as Owner (2)
  INSERT INTO public.user_org_role (user_id, org_id, access_lvl)
  VALUES (v_request.requester_id, v_org_id, 2);

  -- Stamp the request as approved
  UPDATE public.org_requests
  SET status      = 'approved',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE request_id = p_request_id;
END;
$$;


ALTER FUNCTION "public"."approve_org_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_species_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_request       RECORD;
  v_species_id        uuid;
  v_is_superadmin boolean;
BEGIN
  -- Guard: caller must be superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_superadmin = true
  ) THEN
    RAISE EXCEPTION 'Only superadmins can approve org requests';
  END IF;

  -- Fetch the pending request
  SELECT * INTO v_request
  FROM public.species_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Check if requester is a superadmin
  SELECT is_superadmin INTO v_is_superadmin
  FROM public.profiles
  WHERE id = v_request.requester_id;

  -- Create the species
  INSERT INTO public.species (scientific_name, common_name, care_instructions)
  VALUES (v_request.scientific_name, v_request.common_name, v_request.care_instructions)
  RETURNING id INTO v_species_id;

  -- Stamp the request as approved
  UPDATE public.species_requests
  SET status      = 'approved',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_request_id;
END;$$;


ALTER FUNCTION "public"."approve_species_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_alpha_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COUNT(*) INTO next_number
  FROM enclosures
  WHERE org_id = NEW.org_id
  AND species_id = NEW.species_id;

  NEW.alpha_code := generate_alpha_code(next_number);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_alpha_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_enclosure_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_scientific_name text;
    v_seq_val integer;
    v_alpha text;
BEGIN
    -- 1. Fetch the scientific name from the linked species tables
    SELECT s.scientific_name INTO v_scientific_name
    FROM public.org_species os
    JOIN public.species s ON s.id = os.master_species_id
    WHERE os.id = NEW.species_id AND os.org_id = NEW.org_id;

    -- 2. Increment the sequence counter for this org + species
    INSERT INTO public.enclosure_sequences (org_id, org_species_id, current_value)
    VALUES (NEW.org_id, NEW.species_id, 0)
    ON CONFLICT (org_id, org_species_id) 
    DO UPDATE SET current_value = enclosure_sequences.current_value + 1
    RETURNING current_value INTO v_seq_val;

    -- 3. Convert integer to 4-letter alphacode
    v_alpha := public.int_to_alphacode(v_seq_val);

    -- 4. Assign the concatenated name
    NEW.name := v_scientific_name || ' - ' || v_alpha;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_enclosure_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_task_completion_time"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only fire when the task is freshly marked as 'completed'
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        
        -- If the UI set completed_time alongside status, use it. Otherwise default to now()
        IF NEW.completed_time IS NULL THEN
            NEW.completed_time := now();
        END IF;

        -- Calculate the interval if start_time exists
        IF NEW.start_time IS NOT NULL THEN
            NEW.time_to_completion := NEW.completed_time - NEW.start_time;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_task_completion_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_pending_tasks_for_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.tasks
    WHERE schedule_id = OLD.id
      AND status = 'pending';
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_pending_tasks_for_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_alpha_code"("n" bigint) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  base integer := 26;
  result text := '';
  remainder integer;
BEGIN
  LOOP
    remainder := n % base;
    result := substr(chars, remainder + 1, 1) || result;
    n := n / base;

    EXIT WHEN n = 0;
  END LOOP;

  -- ensure minimum length of 4
  WHILE length(result) < 4 LOOP
    result := 'A' || result;
  END LOOP;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_alpha_code"("n" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_next_relative_task"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_sched RECORD;
    v_interval interval;
    v_next_due_date timestamp with time zone;
BEGIN
    -- Only run if the task is being marked as 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        
        IF NEW.schedule_id IS NOT NULL THEN
            -- Fetch the full schedule record
            SELECT * INTO v_sched
            FROM public.enclosure_schedules
            WHERE id = NEW.schedule_id AND is_active = true;

            IF v_sched.schedule_type = 'relative_interval' THEN
                
                -- Guard Clause 1: Max Occurrences Reached
                IF v_sched.max_occurrences IS NOT NULL AND (v_sched.occurrence_count + 1) >= v_sched.max_occurrences THEN
                    UPDATE public.enclosure_schedules 
                    SET is_active = false, occurrence_count = occurrence_count + 1, last_run_at = now()
                    WHERE id = v_sched.id;
                    RETURN NEW;
                END IF;

                BEGIN
                    v_interval := v_sched.schedule_rule::interval;
                EXCEPTION WHEN OTHERS THEN
                    RETURN NEW;
                END;

                v_next_due_date := now() + v_interval;

                -- Guard Clause 2: End Date Passed
                IF v_sched.end_date IS NOT NULL AND v_next_due_date > v_sched.end_date THEN
                    UPDATE public.enclosure_schedules 
                    SET is_active = false, occurrence_count = occurrence_count + 1, last_run_at = now()
                    WHERE id = v_sched.id;
                    RETURN NEW;
                END IF;

                -- Insert the new pending task, inheriting custom properties and assignments
                INSERT INTO public.tasks (
                    enclosure_id,
                    description,
                    status,
                    due_date,
                    priority,
                    name,
                    template_id,
                    schedule_id,
                    time_window,
                    assigned_to
                ) VALUES (
                    NEW.enclosure_id,
                    COALESCE(v_sched.task_description, NEW.description),
                    'pending', 
                    v_next_due_date,
                    COALESCE(v_sched.priority, NEW.priority),
                    COALESCE(v_sched.task_name, NEW.name),
                    NEW.template_id,
                    NEW.schedule_id,
                    NEW.time_window,
                    v_sched.assigned_to
                );
                
                -- Increment the occurrence count on the schedule
                UPDATE public.enclosure_schedules
                SET last_run_at = now(),
                    occurrence_count = occurrence_count + 1
                WHERE id = NEW.schedule_id;

            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_next_relative_task"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.schedule_type = 'relative_interval' THEN
        INSERT INTO public.tasks (
            enclosure_id, 
            template_id, 
            schedule_id, 
            status, 
            due_date,
            time_window, 
            name, 
            description, 
            priority, 
            assigned_to
        ) VALUES (
            NEW.enclosure_id, 
            NEW.template_id, 
            NEW.id, 
            'pending', 
            NEW.start_date,
            NEW.time_window, 
            NEW.task_name, 
            NEW.task_description, 
            NEW.priority, 
            NEW.assigned_to
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_schedule_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 1. STRUCTURAL TIMING CHANGES: Delete future pending tasks so they can be regenerated
    IF (NEW.is_active = false AND OLD.is_active = true) OR
       (NEW.schedule_rule IS DISTINCT FROM OLD.schedule_rule) OR
       (NEW.end_date IS DISTINCT FROM OLD.end_date) OR
       (NEW.advance_task_count IS DISTINCT FROM OLD.advance_task_count) OR
       (NEW.start_date IS DISTINCT FROM OLD.start_date) THEN
       
        DELETE FROM public.tasks 
        WHERE schedule_id = NEW.id AND status = 'pending';
    END IF;

    -- 2. RELATIVE REGENERATION: Generate the next relative task immediately
    -- (This replaces your old reactivation logic to also account for rule changes)
    IF (NEW.is_active = true AND OLD.is_active = false AND NEW.schedule_type = 'relative_interval') OR
       (NEW.is_active = true AND NEW.schedule_type = 'relative_interval' AND (NEW.schedule_rule IS DISTINCT FROM OLD.schedule_rule OR NEW.start_date IS DISTINCT FROM OLD.start_date)) THEN
        
        INSERT INTO public.tasks (
            enclosure_id, template_id, schedule_id, status, due_date, time_window, name, description, priority, assigned_to
        ) VALUES (
            NEW.enclosure_id, NEW.template_id, NEW.id, 'pending', COALESCE(NEW.start_date, now()), NEW.time_window, NEW.task_name, NEW.task_description, NEW.priority, NEW.assigned_to
        );
    END IF;

    -- 3. METADATA CHANGES: Simple in-place update for cosmetic fields
    -- (This replaces your old assignment update logic to handle all text fields)
    IF NEW.is_active = true AND (
        NEW.task_name IS DISTINCT FROM OLD.task_name OR
        NEW.task_description IS DISTINCT FROM OLD.task_description OR
        NEW.priority IS DISTINCT FROM OLD.priority OR
        NEW.time_window IS DISTINCT FROM OLD.time_window OR
        NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
    ) THEN
        UPDATE public.tasks 
        SET name = NEW.task_name,
            description = NEW.task_description,
            priority = NEW.priority,
            time_window = NEW.time_window,
            assigned_to = NEW.assigned_to
        WHERE schedule_id = NEW.id AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_schedule_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_template_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Push the new template values to any schedule using this template
    IF NEW.type IS DISTINCT FROM OLD.type OR NEW.description IS DISTINCT FROM OLD.description THEN
        UPDATE public.enclosure_schedules
        SET task_name = NEW.type,
            task_description = NEW.description
        WHERE template_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_template_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."int_to_alphacode"("num" integer) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    res text := '';
    rem integer;
    val integer := num; 
BEGIN
    FOR i IN 1..4 LOOP
        rem := val % 26;
        res := substr(chars, rem + 1, 1) || res;
        val := val / 26;
    END LOOP;
    RETURN res;
END;
$$;


ALTER FUNCTION "public"."int_to_alphacode"("num" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.user_org_role
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_org_member"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_owner_or_superadmin"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$SELECT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_superadmin = true
)
OR EXISTS (
  SELECT 1
  FROM public.user_org_role uor
  WHERE uor.org_id = p_org_id
    AND uor.user_id = auth.uid()
    AND uor.access_lvl >= 2
);$$;


ALTER FUNCTION "public"."is_org_owner_or_superadmin"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superadmin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_superadmin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_entity_type  text := TG_ARGV[0];
    v_org_strategy text := TG_ARGV[1];
    v_name_col     text := TG_ARGV[2];

    v_actor        uuid := auth.uid();
    v_action       text;
    v_org_id       uuid;
    v_entity_id    uuid;
    v_entity_name  text;
    v_changed      jsonb := '{}'::jsonb;
    v_ignored      text[];
    v_old_json     jsonb;
    v_new_json     jsonb;
    v_row_json     jsonb;
    v_key          text;
    v_id_col       text;
    v_summary      text;
BEGIN
    -- Skip system-generated events (triggers, service role, edge functions).
    IF v_actor IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_old_json := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END;
    v_new_json := CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END;
    v_row_json := COALESCE(v_new_json, v_old_json);

    -- Primary key column varies by table.
    v_id_col := CASE TG_TABLE_NAME
        WHEN 'orgs'          THEN 'org_id'
        WHEN 'invites'       THEN 'invite_id'
        WHEN 'user_org_role' THEN 'user_id'
        ELSE 'id'
    END;
    v_entity_id := (v_row_json->>v_id_col)::uuid;

    -- Resolve org_id.
    IF v_org_strategy = 'self' THEN
        v_org_id := (v_row_json->>'org_id')::uuid;
    ELSIF v_org_strategy = 'via_enclosure' THEN
        SELECT e.org_id
          INTO v_org_id
          FROM public.enclosures e
         WHERE e.id = (v_row_json->>'enclosure_id')::uuid;
    END IF;

    IF v_org_id IS NULL THEN
        -- Can't attribute to an org — skip. (Shouldn't normally happen.)
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Resolve entity_name (denormalized so it survives deletion).
    IF v_name_col <> '' THEN
        v_entity_name := v_row_json->>v_name_col;
    ELSIF TG_TABLE_NAME = 'user_org_role' THEN
        SELECT COALESCE(full_name, email)
          INTO v_entity_name
          FROM public.profiles
         WHERE id = v_entity_id;
    END IF;

    -- Per-table ignore list for UPDATE diffs.
    v_ignored := CASE TG_TABLE_NAME
        WHEN 'enclosures'          THEN ARRAY['updated_at','created_at']
        WHEN 'enclosure_schedules' THEN ARRAY['updated_at','created_at','last_run_at','occurrence_count']
        -- Task completion changes are already surfaced by enclosure_timeline.
        WHEN 'tasks'               THEN ARRAY['updated_at','created_at','status','completed_by','completed_time','start_time','time_to_completion']
        WHEN 'org_species'         THEN ARRAY['updated_at','created_at']
        WHEN 'locations'           THEN ARRAY['updated_at','created_at']
        WHEN 'invites'             THEN ARRAY['updated_at','created_at']
        WHEN 'user_org_role'       THEN ARRAY['updated_at','created_at']
        WHEN 'orgs'                THEN ARRAY['updated_at','created_at']
        ELSE ARRAY[]::text[]
    END;

    -- Action + diff.
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';

    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';

    ELSE -- UPDATE
        v_action := 'update';

        FOR v_key IN SELECT jsonb_object_keys(v_new_json) LOOP
            IF v_key = ANY (v_ignored) THEN
                CONTINUE;
            END IF;
            IF v_old_json->v_key IS DISTINCT FROM v_new_json->v_key THEN
                v_changed := v_changed || jsonb_build_object(
                    v_key,
                    jsonb_build_object(
                        'old', v_old_json->v_key,
                        'new', v_new_json->v_key
                    )
                );
            END IF;
        END LOOP;

        -- Nothing meaningful changed (only ignored cols touched).
        IF v_changed = '{}'::jsonb THEN
            RETURN NEW;
        END IF;

        -- Promote is_active flips to activate/deactivate actions.
        IF v_changed ? 'is_active' THEN
            IF (v_new_json->>'is_active')::boolean IS TRUE THEN
                v_action := 'activate';
            ELSE
                v_action := 'deactivate';
            END IF;
        END IF;
    END IF;

    -- Human-readable summary. Kept plain so gin_trgm index can search it.
    v_summary := trim(
        initcap(v_action) || ' ' ||
        replace(v_entity_type, '_', ' ') ||
        CASE WHEN v_entity_name IS NOT NULL AND v_entity_name <> ''
             THEN ' "' || v_entity_name || '"'
             ELSE '' END
    );

    INSERT INTO public.activity_log (
        org_id, actor_id, action, entity_type, entity_id,
        entity_name, summary, changed_fields
    ) VALUES (
        v_org_id, v_actor, v_action, v_entity_type, v_entity_id,
        v_entity_name, v_summary, v_changed
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_enclosure_count_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Only log when current_count actually changes
    IF OLD.current_count IS DISTINCT FROM NEW.current_count THEN
        INSERT INTO public.enclosure_count_history (
            enclosure_id,
            old_count,
            new_count,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.current_count,
            NEW.current_count,
            auth.uid()            -- captures the Supabase-authenticated user
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_enclosure_count_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_enclosure_life_stage_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF OLD.life_stage IS DISTINCT FROM NEW.life_stage THEN
        INSERT INTO public.enclosure_life_stage_history (
            enclosure_id, old_life_stage, new_life_stage, changed_by
        ) VALUES (
            NEW.id, OLD.life_stage, NEW.life_stage, auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_enclosure_life_stage_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_invite_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only notify on new pending invites
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (
      recipient_id,
      sender_id,
      org_id,
      type,
      title,
      description,
      href
    )
    VALUES (
      NEW.invitee_id,
      NEW.inviter_id,
      NEW.org_id,
      'invite',
      'New Invite',
      'You''ve been invited to an org',
      'https://hivemind.flutr.org/protected/orgs' -- or wherever your UI routes
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_invite_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_superadmins_on_org_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only notify on new pending requests
  IF NEW.status = 'pending' THEN

    INSERT INTO public.notifications (
      recipient_id,
      sender_id,
      type,
      title,
      description,
      href
    )
    SELECT
      p.id, -- each superadmin
      NEW.requester_id,
      'alert',
      'New Org Request',
      'A new organization request was submitted',
      'https://hivemind.flutr.org/protected/superadmin'
    FROM public.profiles p
    WHERE p.is_superadmin = true;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_superadmins_on_org_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_superadmins_on_species_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'pending' THEN

    INSERT INTO public.notifications (
      recipient_id,
      sender_id,
      org_id,
      type,
      title,
      description,
      href
    )
    SELECT
      p.id,
      NEW.requester_id,
      NEW.org_id,
      'alert',
      'New Species Request',
      'A new species request needs review',
      'https://hivemind.flutr.org/protected/superadmin'
    FROM public.profiles p
    WHERE p.is_superadmin = true;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_superadmins_on_species_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prune_activity_log"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_deleted integer;
BEGIN
    DELETE FROM public.activity_log
    WHERE created_at < now() - interval '1 year';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."prune_activity_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_push_on_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform net.http_post(
    url := 'https://dlvxxpagmtedrgwwuyxm.supabase.co/functions/v1/send-push',
    body := row_to_json(NEW)::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdnh4cGFnbXRlZHJnd3d1eXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDMyMTMsImV4cCI6MjA3NTY3OTIxM30.IVaCI7fMtUtv-XS4KXGi-iN8S4eITpI7yeAwfgNJvfk', 
      'x-trigger-secret', '8c91a0c8b4d7497aa6f2a3b7e5d94e1a4f9c3e6a7d1b8f2c4e5a6b7d8c9e0f1'
    )
  );

  return NEW;
end;
$$;


ALTER FUNCTION "public"."send_push_on_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.profiles
  SET email      = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_email"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "entity_name" "text",
    "summary" "text" NOT NULL,
    "changed_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "activity_log_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text", 'activate'::"text", 'deactivate'::"text"]))),
    CONSTRAINT "activity_log_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['enclosure'::"text", 'org_species'::"text", 'enclosure_schedule'::"text", 'task'::"text", 'location'::"text", 'invite'::"text", 'membership'::"text", 'org'::"text"])))
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_log" IS 'Org-scoped user activity audit log. Written by log_activity() trigger. Retained 1 year.';



COMMENT ON COLUMN "public"."activity_log"."changed_fields" IS 'For updates: { "col": { "old": <v>, "new": <v> }, ... }. Empty on create/delete.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "full_name" "text" GENERATED ALWAYS AS ((("first_name" || ' '::"text") || "last_name")) STORED,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "theme_preference" "text" DEFAULT 'system'::"text",
    "is_superadmin" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."activity_log_view" WITH ("security_invoker"='true') AS
 SELECT "al"."id",
    "al"."created_at",
    "al"."org_id",
    "al"."actor_id",
    "p"."full_name" AS "actor_name",
    "p"."email" AS "actor_email",
    "al"."action",
    "al"."entity_type",
    "al"."entity_id",
    "al"."entity_name",
    "al"."summary",
    "al"."changed_fields"
   FROM ("public"."activity_log" "al"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "al"."actor_id")));


ALTER VIEW "public"."activity_log_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_template_id" "uuid" NOT NULL,
    "question_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "type" "text" NOT NULL,
    "required" boolean DEFAULT false NOT NULL,
    "choices" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."question_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_form_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_form_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "species_id" "uuid",
    "type" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "enclosure_id" "uuid",
    "description" "text",
    "status" "text",
    "due_date" timestamp with time zone,
    "priority" "text",
    "completed_by" "uuid",
    "completed_time" timestamp with time zone,
    "name" "text",
    "template_id" "uuid",
    "schedule_id" "uuid",
    "time_window" "text",
    "start_time" timestamp with time zone,
    "time_to_completion" interval,
    "assigned_to" "uuid",
    CONSTRAINT "tasks_time_window_check" CHECK (("time_window" = ANY (ARRAY['Morning'::"text", 'Afternoon'::"text", 'Any'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Stores all individual tasks (both pending and completed) for each tank.';



CREATE OR REPLACE VIEW "public"."completed_tasks_with_form_data" WITH ("security_invoker"='true') AS
 SELECT "t"."id" AS "task_id",
    "t"."enclosure_id",
    "t"."name" AS "task_name",
    "t"."description" AS "task_description",
    "t"."status",
    "t"."priority",
    "t"."completed_by",
    "t"."completed_time",
    "t"."time_to_completion",
    "t"."assigned_to",
    "t"."template_id",
    "t"."schedule_id",
    "tt"."type" AS "template_type",
    "string_agg"((("qt"."label" || ': '::"text") || COALESCE(NULLIF(TRIM(BOTH FROM "tfd"."answer"), ''::"text"), 'N/A'::"text")), ' | '::"text" ORDER BY "qt"."order") AS "form_answers"
   FROM ((("public"."tasks" "t"
     JOIN "public"."task_form_data" "tfd" ON (("tfd"."task_id" = "t"."id")))
     LEFT JOIN "public"."question_templates" "qt" ON (("qt"."id" = "tfd"."question_id")))
     LEFT JOIN "public"."task_templates" "tt" ON (("tt"."id" = "t"."template_id")))
  WHERE ("t"."status" = 'completed'::"text")
  GROUP BY "t"."id", "t"."enclosure_id", "t"."name", "t"."description", "t"."status", "t"."priority", "t"."completed_by", "t"."completed_time", "t"."time_to_completion", "t"."assigned_to", "t"."template_id", "t"."schedule_id", "tt"."type";


ALTER VIEW "public"."completed_tasks_with_form_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enclosure_count_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enclosure_id" "uuid" NOT NULL,
    "old_count" bigint,
    "new_count" bigint,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enclosure_count_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."enclosure_count_history" IS 'Audit log tracking every change to enclosures.current_count';



CREATE TABLE IF NOT EXISTS "public"."enclosure_life_stage_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enclosure_id" "uuid" NOT NULL,
    "old_life_stage" "text",
    "new_life_stage" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enclosure_life_stage_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."enclosure_life_stage_history" IS 'Audit log tracking every change to enclosures.life_stage';



CREATE TABLE IF NOT EXISTS "public"."enclosure_lineage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enclosure_id" "uuid" NOT NULL,
    "source_enclosure_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "enclosure_lineage_no_self_ref" CHECK (("enclosure_id" <> "source_enclosure_id"))
);


ALTER TABLE "public"."enclosure_lineage" OWNER TO "postgres";


COMMENT ON TABLE "public"."enclosure_lineage" IS 'Tracks parent/source relationships between enclosures within an org';



CREATE TABLE IF NOT EXISTS "public"."enclosure_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "enclosure_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "schedule_type" "text" NOT NULL,
    "schedule_rule" "text" NOT NULL,
    "time_window" "text" DEFAULT 'Any'::"text",
    "is_active" boolean DEFAULT true,
    "last_run_at" timestamp with time zone,
    "task_name" "text",
    "task_description" "text",
    "priority" "text",
    "assigned_to" "uuid",
    "end_date" timestamp with time zone,
    "max_occurrences" integer,
    "occurrence_count" integer DEFAULT 0,
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "advance_task_count" integer DEFAULT 7 NOT NULL,
    CONSTRAINT "enclosure_schedules_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['fixed_calendar'::"text", 'relative_interval'::"text"]))),
    CONSTRAINT "enclosure_schedules_time_window_check" CHECK (("time_window" = ANY (ARRAY['Morning'::"text", 'Afternoon'::"text", 'Any'::"text"])))
);


ALTER TABLE "public"."enclosure_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enclosure_sequences" (
    "org_id" "uuid" NOT NULL,
    "org_species_id" "uuid" NOT NULL,
    "current_value" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."enclosure_sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."enclosure_sequences" IS 'To keep track of the alphacode generation naming for each org species';



CREATE TABLE IF NOT EXISTS "public"."enclosures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid",
    "species_id" "uuid",
    "name" "text",
    "location" "uuid" DEFAULT "gen_random_uuid"(),
    "current_count" bigint,
    "is_active" boolean DEFAULT true NOT NULL,
    "alpha_code" "text",
    "printed" boolean DEFAULT false,
    "institutional_specimen_id" "text",
    "institutional_external_source" "text",
    "life_stage" "text"
);


ALTER TABLE "public"."enclosures" OWNER TO "postgres";


COMMENT ON TABLE "public"."enclosures" IS 'Represents a specific tank';



COMMENT ON COLUMN "public"."enclosures"."institutional_specimen_id" IS 'The internal ID this org uses to identify the specimen in this enclosure';



COMMENT ON COLUMN "public"."enclosures"."institutional_external_source" IS 'Name of the external institution or breeder the specimen was acquired from';



CREATE TABLE IF NOT EXISTS "public"."org_species" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "master_species_id" "uuid" NOT NULL,
    "custom_common_name" "text",
    "custom_care_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."org_species" OWNER TO "postgres";


COMMENT ON COLUMN "public"."org_species"."is_active" IS 'whether or not the species displays for the org';



CREATE TABLE IF NOT EXISTS "public"."species" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scientific_name" "text" NOT NULL,
    "common_name" "text",
    "care_instructions" "text",
    "picture_url" "text"
);


ALTER TABLE "public"."species" OWNER TO "postgres";


COMMENT ON TABLE "public"."species" IS 'List of global species all orgs can reference';



CREATE TABLE IF NOT EXISTS "public"."tank_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "enclosure_id" "uuid",
    "user_id" "uuid",
    "note_text" "text",
    "is_flagged" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."tank_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."tank_notes" IS 'Table to store all notes and observations for a tank, forming the basis of its history';



CREATE OR REPLACE VIEW "public"."enclosure_timeline" WITH ("security_invoker"='true') AS
 SELECT "ctf"."completed_time" AS "event_date",
    'task'::"text" AS "record_type",
    "e"."org_id",
    "ctf"."enclosure_id",
    "e"."name" AS "enclosure_name",
    "os"."id" AS "species_id",
    "s"."scientific_name" AS "species_name",
    "ctf"."task_name" AS "summary",
    "ctf"."form_answers" AS "details",
    "ctf"."completed_by" AS "user_id",
    "pc"."full_name" AS "user_name",
    "ctf"."task_name",
    "ctf"."template_type",
    "ctf"."priority"
   FROM (((("public"."completed_tasks_with_form_data" "ctf"
     LEFT JOIN "public"."enclosures" "e" ON (("e"."id" = "ctf"."enclosure_id")))
     LEFT JOIN "public"."org_species" "os" ON (("os"."id" = "e"."species_id")))
     LEFT JOIN "public"."species" "s" ON (("s"."id" = "os"."master_species_id")))
     LEFT JOIN "public"."profiles" "pc" ON (("pc"."id" = "ctf"."completed_by")))
UNION ALL
 SELECT "t"."completed_time" AS "event_date",
    'task'::"text" AS "record_type",
    "e"."org_id",
    "t"."enclosure_id",
    "e"."name" AS "enclosure_name",
    "os"."id" AS "species_id",
    "s"."scientific_name" AS "species_name",
    "t"."name" AS "summary",
    NULL::"text" AS "details",
    "t"."completed_by" AS "user_id",
    "pc"."full_name" AS "user_name",
    "t"."name" AS "task_name",
    "tt"."type" AS "template_type",
    "t"."priority"
   FROM ((((("public"."tasks" "t"
     LEFT JOIN "public"."enclosures" "e" ON (("e"."id" = "t"."enclosure_id")))
     LEFT JOIN "public"."org_species" "os" ON (("os"."id" = "e"."species_id")))
     LEFT JOIN "public"."species" "s" ON (("s"."id" = "os"."master_species_id")))
     LEFT JOIN "public"."profiles" "pc" ON (("pc"."id" = "t"."completed_by")))
     LEFT JOIN "public"."task_templates" "tt" ON (("tt"."id" = "t"."template_id")))
  WHERE (("t"."status" = 'completed'::"text") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."task_form_data" "tfd"
          WHERE ("tfd"."task_id" = "t"."id")))))
UNION ALL
 SELECT "tn"."created_at" AS "event_date",
    'note'::"text" AS "record_type",
    "e"."org_id",
    "tn"."enclosure_id",
    "e"."name" AS "enclosure_name",
    "os"."id" AS "species_id",
    "s"."scientific_name" AS "species_name",
    "tn"."note_text" AS "summary",
        CASE
            WHEN "tn"."is_flagged" THEN 'FLAGGED'::"text"
            ELSE NULL::"text"
        END AS "details",
    "tn"."user_id",
    "p"."full_name" AS "user_name",
    NULL::"text" AS "task_name",
    NULL::"text" AS "template_type",
    NULL::"text" AS "priority"
   FROM (((("public"."tank_notes" "tn"
     LEFT JOIN "public"."enclosures" "e" ON (("e"."id" = "tn"."enclosure_id")))
     LEFT JOIN "public"."org_species" "os" ON (("os"."id" = "e"."species_id")))
     LEFT JOIN "public"."species" "s" ON (("s"."id" = "os"."master_species_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "tn"."user_id")))
UNION ALL
 SELECT "ech"."changed_at" AS "event_date",
    'count_change'::"text" AS "record_type",
    "e"."org_id",
    "ech"."enclosure_id",
    "e"."name" AS "enclosure_name",
    "os"."id" AS "species_id",
    "s"."scientific_name" AS "species_name",
    ((('Count changed: '::"text" || COALESCE(("ech"."old_count")::"text", 'N/A'::"text")) || ' → '::"text") || COALESCE(("ech"."new_count")::"text", 'N/A'::"text")) AS "summary",
    NULL::"text" AS "details",
    "ech"."changed_by" AS "user_id",
    "p"."full_name" AS "user_name",
    NULL::"text" AS "task_name",
    NULL::"text" AS "template_type",
    NULL::"text" AS "priority"
   FROM (((("public"."enclosure_count_history" "ech"
     LEFT JOIN "public"."enclosures" "e" ON (("e"."id" = "ech"."enclosure_id")))
     LEFT JOIN "public"."org_species" "os" ON (("os"."id" = "e"."species_id")))
     LEFT JOIN "public"."species" "s" ON (("s"."id" = "os"."master_species_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "ech"."changed_by")))
UNION ALL
 SELECT "elsh"."changed_at" AS "event_date",
    'life_stage_change'::"text" AS "record_type",
    "e"."org_id",
    "elsh"."enclosure_id",
    "e"."name" AS "enclosure_name",
    "os"."id" AS "species_id",
    "s"."scientific_name" AS "species_name",
    ((('Life stage changed: '::"text" || COALESCE("elsh"."old_life_stage", 'N/A'::"text")) || ' → '::"text") || COALESCE("elsh"."new_life_stage", 'N/A'::"text")) AS "summary",
    NULL::"text" AS "details",
    "elsh"."changed_by" AS "user_id",
    "p"."full_name" AS "user_name",
    NULL::"text" AS "task_name",
    NULL::"text" AS "template_type",
    NULL::"text" AS "priority"
   FROM (((("public"."enclosure_life_stage_history" "elsh"
     LEFT JOIN "public"."enclosures" "e" ON (("e"."id" = "elsh"."enclosure_id")))
     LEFT JOIN "public"."org_species" "os" ON (("os"."id" = "e"."species_id")))
     LEFT JOIN "public"."species" "s" ON (("s"."id" = "os"."master_species_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "elsh"."changed_by")));


ALTER VIEW "public"."enclosure_timeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "feedback_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    CONSTRAINT "feedback_type_check" CHECK (("type" = ANY (ARRAY['bug'::"text", 'feedback'::"text"])))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "invite_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "access_lvl" bigint NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '2 days'::interval) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invitee_id" "uuid" NOT NULL,
    CONSTRAINT "invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "org_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "href" "text",
    "viewed" boolean DEFAULT false NOT NULL,
    "viewed_at" timestamp with time zone,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['mention'::"text", 'invite'::"text", 'update'::"text", 'alert'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_requests" (
    "request_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "org_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "org_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."org_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "org_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."orgs" OWNER TO "postgres";


COMMENT ON TABLE "public"."orgs" IS 'Stores ids and names of orgs';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "last_used_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."species_care_instructions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "species_id" "uuid",
    "org_species_id" "uuid",
    "file_name" "text",
    "file_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."species_care_instructions" OWNER TO "postgres";


COMMENT ON TABLE "public"."species_care_instructions" IS 'each record holds info for care instructions doc';



COMMENT ON COLUMN "public"."species_care_instructions"."file_name" IS 'will be used to know what the file is for (eg. nymph care instructions, adult, etc)';



CREATE TABLE IF NOT EXISTS "public"."species_requests" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "scientific_name" "text" DEFAULT ''::"text" NOT NULL,
    "common_name" "text" NOT NULL,
    "reviewer_id" "uuid",
    "care_instructions" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_at" timestamp with time zone,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."species_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_org_role" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "access_lvl" bigint
);


ALTER TABLE "public"."user_org_role" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_org_role" IS 'Links user ids to the orgs they are part and the access level they have for each';



ALTER TABLE ONLY "public"."user_org_role"
    ADD CONSTRAINT "Org_Level_Access_pkey" PRIMARY KEY ("user_id", "org_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enclosure_count_history"
    ADD CONSTRAINT "enclosure_count_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enclosure_life_stage_history"
    ADD CONSTRAINT "enclosure_life_stage_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enclosure_lineage"
    ADD CONSTRAINT "enclosure_lineage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enclosure_lineage"
    ADD CONSTRAINT "enclosure_lineage_unique_pair" UNIQUE ("enclosure_id", "source_enclosure_id");



ALTER TABLE ONLY "public"."enclosure_schedules"
    ADD CONSTRAINT "enclosure_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enclosure_sequences"
    ADD CONSTRAINT "enclosure_sequences_pkey" PRIMARY KEY ("org_id", "org_species_id");



ALTER TABLE ONLY "public"."enclosures"
    ADD CONSTRAINT "enclosures_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."enclosures"
    ADD CONSTRAINT "enclosures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("feedback_id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("invite_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_requests"
    ADD CONSTRAINT "org_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."org_species"
    ADD CONSTRAINT "org_species_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_templates"
    ADD CONSTRAINT "question_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."species_care_instructions"
    ADD CONSTRAINT "species_care_instructions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."species"
    ADD CONSTRAINT "species_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."species"
    ADD CONSTRAINT "species_pkey" PRIMARY KEY ("id", "scientific_name");



ALTER TABLE ONLY "public"."species_requests"
    ADD CONSTRAINT "species_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tank_notes"
    ADD CONSTRAINT "tank_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_form_data"
    ADD CONSTRAINT "task_form_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_form_data"
    ADD CONSTRAINT "task_form_data_task_id_question_id_key" UNIQUE ("task_id", "question_id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enclosures"
    ADD CONSTRAINT "unique_alpha_per_species_org" UNIQUE ("org_id", "species_id", "alpha_code");



CREATE INDEX "activity_log_org_actor_idx" ON "public"."activity_log" USING "btree" ("org_id", "actor_id");



CREATE INDEX "activity_log_org_created_idx" ON "public"."activity_log" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "activity_log_org_entity_idx" ON "public"."activity_log" USING "btree" ("org_id", "entity_type", "entity_id");



CREATE INDEX "activity_log_summary_trgm_idx" ON "public"."activity_log" USING "gin" ("summary" "public"."gin_trgm_ops");



CREATE INDEX "feedback_created_at_idx" ON "public"."feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "feedback_org_id_idx" ON "public"."feedback" USING "btree" ("org_id");



CREATE INDEX "feedback_user_id_idx" ON "public"."feedback" USING "btree" ("user_id");



CREATE INDEX "idx_enclosure_count_history_changed_at" ON "public"."enclosure_count_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_enclosure_count_history_enclosure_id" ON "public"."enclosure_count_history" USING "btree" ("enclosure_id");



CREATE INDEX "idx_enclosure_life_stage_history_changed_at" ON "public"."enclosure_life_stage_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_enclosure_life_stage_history_enclosure_id" ON "public"."enclosure_life_stage_history" USING "btree" ("enclosure_id");



CREATE INDEX "idx_enclosure_lineage_enclosure_id" ON "public"."enclosure_lineage" USING "btree" ("enclosure_id");



CREATE INDEX "idx_enclosure_lineage_source_id" ON "public"."enclosure_lineage" USING "btree" ("source_enclosure_id");



CREATE INDEX "idx_enclosures_is_active" ON "public"."enclosures" USING "btree" ("is_active");



CREATE INDEX "idx_question_templates_task_template_id" ON "public"."question_templates" USING "btree" ("task_template_id");



CREATE INDEX "idx_tank_notes_enclosure_created" ON "public"."tank_notes" USING "btree" ("enclosure_id", "created_at" DESC);



CREATE INDEX "idx_tank_notes_is_flagged" ON "public"."tank_notes" USING "btree" ("is_flagged") WHERE ("is_flagged" = true);



CREATE INDEX "idx_task_form_data_question_id" ON "public"."task_form_data" USING "btree" ("question_id");



CREATE INDEX "idx_task_form_data_task_id" ON "public"."task_form_data" USING "btree" ("task_id");



CREATE INDEX "idx_tasks_status_completed_time" ON "public"."tasks" USING "btree" ("status", "completed_time" DESC) WHERE ("status" = 'completed'::"text");



CREATE INDEX "invites_invitee_email_idx" ON "public"."invites" USING "btree" ("invitee_email");



CREATE INDEX "invites_org_id_idx" ON "public"."invites" USING "btree" ("org_id");



CREATE INDEX "invites_status_idx" ON "public"."invites" USING "btree" ("status");



CREATE UNIQUE INDEX "invites_unique_pending" ON "public"."invites" USING "btree" ("org_id", "invitee_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "notifications_recipient_idx" ON "public"."notifications" USING "btree" ("recipient_id");



CREATE INDEX "notifications_recipient_viewed_idx" ON "public"."notifications" USING "btree" ("recipient_id", "viewed");



CREATE INDEX "species_care_instructions_org_species_id_idx" ON "public"."species_care_instructions" USING "btree" ("org_species_id") WHERE ("org_species_id" IS NOT NULL);



CREATE INDEX "species_care_instructions_species_id_idx" ON "public"."species_care_instructions" USING "btree" ("species_id") WHERE ("species_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "generate-first-scheduled-tasks" AFTER INSERT OR UPDATE ON "public"."enclosure_schedules" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://dlvxxpagmtedrgwwuyxm.supabase.co/functions/v1/generate-single-calendar-task', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdnh4cGFnbXRlZHJnd3d1eXhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwMzIxMywiZXhwIjoyMDc1Njc5MjEzfQ.V2DZlfs18HKo313_JKrve-D5kOAExM9D4Q3LFxOeG7Y"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "invite_notification_trigger" AFTER INSERT ON "public"."invites" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_invite_created"();



CREATE OR REPLACE TRIGGER "invites_set_updated_at" BEFORE UPDATE ON "public"."invites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "org_request_notification_trigger" AFTER INSERT ON "public"."org_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_superadmins_on_org_request"();



CREATE OR REPLACE TRIGGER "send_push_on_notification" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."send_push_on_notification"();



CREATE OR REPLACE TRIGGER "set_alpha_code" BEFORE INSERT ON "public"."enclosures" FOR EACH ROW WHEN (("new"."alpha_code" IS NULL)) EXECUTE FUNCTION "public"."assign_alpha_code"();



CREATE OR REPLACE TRIGGER "species_request_notification_trigger" AFTER INSERT ON "public"."species_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_superadmins_on_species_request"();



CREATE OR REPLACE TRIGGER "trg_activity_log_enclosure_schedules" AFTER INSERT OR DELETE OR UPDATE ON "public"."enclosure_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('enclosure_schedule', 'via_enclosure', 'task_name');



CREATE OR REPLACE TRIGGER "trg_activity_log_enclosures" AFTER INSERT OR DELETE OR UPDATE ON "public"."enclosures" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('enclosure', 'self', 'name');



CREATE OR REPLACE TRIGGER "trg_activity_log_invites" AFTER INSERT OR DELETE OR UPDATE ON "public"."invites" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('invite', 'self', 'invitee_email');



CREATE OR REPLACE TRIGGER "trg_activity_log_locations" AFTER INSERT OR DELETE OR UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('location', 'self', 'name');



CREATE OR REPLACE TRIGGER "trg_activity_log_org_species" AFTER INSERT OR DELETE OR UPDATE ON "public"."org_species" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('org_species', 'self', 'custom_common_name');



CREATE OR REPLACE TRIGGER "trg_activity_log_orgs" AFTER INSERT OR DELETE OR UPDATE ON "public"."orgs" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('org', 'self', 'name');



CREATE OR REPLACE TRIGGER "trg_activity_log_tasks" AFTER INSERT OR DELETE OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('task', 'via_enclosure', 'name');



CREATE OR REPLACE TRIGGER "trg_activity_log_user_org_role" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_org_role" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"('membership', 'self', '');



CREATE OR REPLACE TRIGGER "trg_delete_pending_tasks_for_schedule" BEFORE DELETE ON "public"."enclosure_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."delete_pending_tasks_for_schedule"();



CREATE OR REPLACE TRIGGER "trigger_calculate_task_completion_time" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_task_completion_time"();



CREATE OR REPLACE TRIGGER "trigger_generate_initial_relative_task" AFTER INSERT ON "public"."enclosure_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_schedule"();



CREATE OR REPLACE TRIGGER "trigger_generate_next_relative_task" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."generate_next_relative_task"();



CREATE OR REPLACE TRIGGER "trigger_handle_schedule_updates" AFTER UPDATE ON "public"."enclosure_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_schedule_updates"();



CREATE OR REPLACE TRIGGER "trigger_handle_template_updates" AFTER UPDATE ON "public"."task_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_template_updates"();



CREATE OR REPLACE TRIGGER "trigger_log_enclosure_count_change" AFTER UPDATE ON "public"."enclosures" FOR EACH ROW EXECUTE FUNCTION "public"."log_enclosure_count_change"();



CREATE OR REPLACE TRIGGER "trigger_log_enclosure_life_stage_change" AFTER UPDATE ON "public"."enclosures" FOR EACH ROW EXECUTE FUNCTION "public"."log_enclosure_life_stage_change"();



CREATE OR REPLACE TRIGGER "trigger_set_enclosure_name" BEFORE INSERT ON "public"."enclosures" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_enclosure_name"();



ALTER TABLE ONLY "public"."user_org_role"
    ADD CONSTRAINT "Org_Level_Access_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_org_role"
    ADD CONSTRAINT "Org_Level_Access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "Tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "Tasks_tank_id_fkey" FOREIGN KEY ("enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_count_history"
    ADD CONSTRAINT "enclosure_count_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enclosure_count_history"
    ADD CONSTRAINT "enclosure_count_history_enclosure_id_fkey" FOREIGN KEY ("enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_life_stage_history"
    ADD CONSTRAINT "enclosure_life_stage_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enclosure_life_stage_history"
    ADD CONSTRAINT "enclosure_life_stage_history_enclosure_id_fkey" FOREIGN KEY ("enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_lineage"
    ADD CONSTRAINT "enclosure_lineage_enclosure_id_fkey" FOREIGN KEY ("enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_lineage"
    ADD CONSTRAINT "enclosure_lineage_source_enclosure_id_fkey" FOREIGN KEY ("source_enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enclosure_schedules"
    ADD CONSTRAINT "enclosure_schedules_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enclosure_schedules"
    ADD CONSTRAINT "enclosure_schedules_enclosure_id_fkey" FOREIGN KEY ("enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_schedules"
    ADD CONSTRAINT "enclosure_schedules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_sequences"
    ADD CONSTRAINT "enclosure_sequences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosure_sequences"
    ADD CONSTRAINT "enclosure_sequences_org_species_id_fkey" FOREIGN KEY ("org_species_id") REFERENCES "public"."org_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_requests"
    ADD CONSTRAINT "org_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_requests"
    ADD CONSTRAINT "org_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_species"
    ADD CONSTRAINT "org_species_master_species_id_fkey" FOREIGN KEY ("master_species_id") REFERENCES "public"."species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_species"
    ADD CONSTRAINT "org_species_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_templates"
    ADD CONSTRAINT "question_templates_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "public"."task_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."species_care_instructions"
    ADD CONSTRAINT "species_care_instructions_org_species_id_fkey" FOREIGN KEY ("org_species_id") REFERENCES "public"."org_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."species_care_instructions"
    ADD CONSTRAINT "species_care_instructions_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."species_requests"
    ADD CONSTRAINT "species_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."species_requests"
    ADD CONSTRAINT "species_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."species_requests"
    ADD CONSTRAINT "species_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tank_notes"
    ADD CONSTRAINT "tank_notes_tank_id_fkey" FOREIGN KEY ("enclosure_id") REFERENCES "public"."enclosures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tank_notes"
    ADD CONSTRAINT "tank_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enclosures"
    ADD CONSTRAINT "tanks_location_fkey" FOREIGN KEY ("location") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enclosures"
    ADD CONSTRAINT "tanks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enclosures"
    ADD CONSTRAINT "tanks_org_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."org_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_form_data"
    ADD CONSTRAINT "task_form_data_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."task_form_data"
    ADD CONSTRAINT "task_form_data_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."enclosure_schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_org_role"
    ADD CONSTRAINT "user_org_role_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Any authenticated user can read question_templates" ON "public"."question_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Any authenticated user can read task_templates" ON "public"."task_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can read global care docs" ON "public"."species_care_instructions" FOR SELECT TO "authenticated" USING (("species_id" IS NOT NULL));



CREATE POLICY "Authenticated users can submit feedback" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view any profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view species" ON "public"."species" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Invitees can accept or reject their invites" ON "public"."invites" FOR UPDATE TO "authenticated" USING (("invitee_email" = ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("invitee_email" = ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Invitees can view orgs they are invited to" ON "public"."orgs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."invites" "i"
  WHERE (("i"."org_id" = "orgs"."org_id") AND ("i"."status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"])) AND ("i"."invitee_email" = ( SELECT "p"."email"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"())))))));



CREATE POLICY "Invitees can view their own invites" ON "public"."invites" FOR SELECT TO "authenticated" USING (("invitee_email" = ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Members can view their org roles" ON "public"."user_org_role" FOR SELECT TO "authenticated" USING (("public"."is_org_member"("org_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true))))));



CREATE POLICY "Only superadmins can update is_superadmin" ON "public"."profiles" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_superadmin" = true))))) WITH CHECK ((("is_superadmin" = "is_superadmin") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_superadmin" = true))))));



CREATE POLICY "Org members can read count history" ON "public"."enclosure_count_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "enclosure_count_history"."enclosure_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org members can read life stage history" ON "public"."enclosure_life_stage_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "enclosure_life_stage_history"."enclosure_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org members can read their sequences" ON "public"."enclosure_sequences" FOR SELECT TO "authenticated" USING ("public"."is_org_member"("org_id"));



CREATE POLICY "Org members can view activity log" ON "public"."activity_log" FOR SELECT TO "authenticated" USING ("public"."is_org_member"("org_id"));



CREATE POLICY "Org members create species_requests" ON "public"."species_requests" FOR INSERT TO "authenticated" WITH CHECK ((("requester_id" = "auth"."uid"()) AND "public"."is_org_member"("org_id")));



CREATE POLICY "Org members manage enclosure schedules" ON "public"."enclosure_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "enclosure_schedules"."enclosure_id") AND "public"."is_org_member"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "enclosure_schedules"."enclosure_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org members manage enclosures" ON "public"."enclosures" TO "authenticated" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));



CREATE POLICY "Org members manage lineage in their org" ON "public"."enclosure_lineage" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "enclosure_lineage"."enclosure_id") AND "public"."is_org_member"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "enclosure_lineage"."enclosure_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org members manage locations" ON "public"."locations" TO "authenticated" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));



CREATE POLICY "Org members manage org care docs" ON "public"."species_care_instructions" TO "authenticated" USING ((("org_species_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_species" "os"
  WHERE (("os"."id" = "species_care_instructions"."org_species_id") AND "public"."is_org_member"("os"."org_id")))))) WITH CHECK ((("org_species_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_species" "os"
  WHERE (("os"."id" = "species_care_instructions"."org_species_id") AND "public"."is_org_member"("os"."org_id"))))));



CREATE POLICY "Org members manage org_species" ON "public"."org_species" TO "authenticated" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));



CREATE POLICY "Org members manage tank notes" ON "public"."tank_notes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "tank_notes"."enclosure_id") AND "public"."is_org_member"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "tank_notes"."enclosure_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org members manage tasks" ON "public"."tasks" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "tasks"."enclosure_id") AND "public"."is_org_member"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."enclosures" "e"
  WHERE (("e"."id" = "tasks"."enclosure_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org members manage their task form data" ON "public"."task_form_data" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."enclosures" "e" ON (("e"."id" = "t"."enclosure_id")))
  WHERE (("t"."id" = "task_form_data"."task_id") AND "public"."is_org_member"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."enclosures" "e" ON (("e"."id" = "t"."enclosure_id")))
  WHERE (("t"."id" = "task_form_data"."task_id") AND "public"."is_org_member"("e"."org_id")))));



CREATE POLICY "Org owners and superadmins can view org invites" ON "public"."invites" FOR SELECT TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Org owners see their org species_requests" ON "public"."species_requests" FOR SELECT TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Owners and superadmins can remove members" ON "public"."user_org_role" FOR DELETE TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Owners and superadmins can retract invites" ON "public"."invites" FOR UPDATE TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id")) WITH CHECK ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Owners and superadmins can send invites" ON "public"."invites" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Owners and superadmins can update roles" ON "public"."user_org_role" FOR UPDATE TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id")) WITH CHECK ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Owners or superadmins can delete orgs" ON "public"."orgs" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Owners or superadmins can update orgs" ON "public"."orgs" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ("public"."is_org_owner_or_superadmin"("org_id")) WITH CHECK ("public"."is_org_owner_or_superadmin"("org_id"));



CREATE POLICY "Recipients can delete their notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Recipients can read their notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Recipients can update their notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Requesters can retract pending species_requests" ON "public"."species_requests" FOR UPDATE TO "authenticated" USING ((("requester_id" = "auth"."uid"()) AND ("status" = 'pending'::"text"))) WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "Requesters see their own species_requests" ON "public"."species_requests" FOR SELECT TO "authenticated" USING (("requester_id" = "auth"."uid"()));



CREATE POLICY "Superadmins can delete feedback" ON "public"."feedback" FOR DELETE TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can insert any user_org_role" ON "public"."user_org_role" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins can insert orgs" ON "public"."orgs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can manage species" ON "public"."species" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can read all count history" ON "public"."enclosure_count_history" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can read all life stage history" ON "public"."enclosure_life_stage_history" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can read all notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can read feedback" ON "public"."feedback" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can update any user_org_role" ON "public"."user_org_role" FOR UPDATE TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins can update feedback" ON "public"."feedback" FOR UPDATE TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins can update org requests" ON "public"."org_requests" FOR UPDATE TO "authenticated" USING (( SELECT "profiles"."is_superadmin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) WITH CHECK (( SELECT "profiles"."is_superadmin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())));



CREATE POLICY "Superadmins can view all activity" ON "public"."activity_log" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"());



CREATE POLICY "Superadmins can view all invites" ON "public"."invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can view all orgs" ON "public"."orgs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins full access to enclosures" ON "public"."enclosures" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins full access to lineage" ON "public"."enclosure_lineage" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins full access to locations" ON "public"."locations" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins full access to species_requests" ON "public"."species_requests" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins full access to tank notes" ON "public"."tank_notes" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins full access to tasks" ON "public"."tasks" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins manage global care docs" ON "public"."species_care_instructions" TO "authenticated" USING ((("species_id" IS NOT NULL) AND "public"."is_superadmin"())) WITH CHECK ((("species_id" IS NOT NULL) AND "public"."is_superadmin"()));



CREATE POLICY "Superadmins manage question_templates" ON "public"."question_templates" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Superadmins manage task_templates" ON "public"."task_templates" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



CREATE POLICY "Users can create their own org requests" ON "public"."org_requests" FOR INSERT TO "authenticated" WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "Users can join orgs via invite" ON "public"."user_org_role" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can leave orgs" ON "public"."user_org_role" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own feedback" ON "public"."feedback" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can retract their own pending org requests" ON "public"."org_requests" FOR UPDATE TO "authenticated" USING ((("requester_id" = "auth"."uid"()) AND ("status" = 'pending'::"text"))) WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile (not is_superadmin)" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("is_superadmin" = "is_superadmin")));



CREATE POLICY "Users can view their orgs" ON "public"."orgs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_org_role"
  WHERE (("user_org_role"."org_id" = "orgs"."org_id") AND ("user_org_role"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own org requests" ON "public"."org_requests" FOR SELECT TO "authenticated" USING ((("requester_id" = "auth"."uid"()) OR ( SELECT "profiles"."is_superadmin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users manage their own push subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enclosure_count_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enclosure_life_stage_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enclosure_lineage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enclosure_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enclosure_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enclosures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."species_care_instructions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."species_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tank_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_form_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_org_role" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."approve_org_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_org_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_org_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_species_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_species_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_species_request"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_alpha_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_alpha_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_alpha_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_enclosure_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_enclosure_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_enclosure_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_task_completion_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_task_completion_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_task_completion_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_pending_tasks_for_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_pending_tasks_for_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_pending_tasks_for_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_alpha_code"("n" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_alpha_code"("n" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_alpha_code"("n" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_next_relative_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_next_relative_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_next_relative_task"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_schedule_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_schedule_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_schedule_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_template_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_template_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_template_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."int_to_alphacode"("num" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int_to_alphacode"("num" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int_to_alphacode"("num" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_owner_or_superadmin"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_owner_or_superadmin"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_owner_or_superadmin"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superadmin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_superadmin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superadmin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_enclosure_count_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_enclosure_count_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_enclosure_count_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_enclosure_life_stage_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_enclosure_life_stage_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_enclosure_life_stage_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_invite_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_invite_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_invite_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_superadmins_on_org_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_superadmins_on_org_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_superadmins_on_org_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_superadmins_on_species_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_superadmins_on_species_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_superadmins_on_species_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prune_activity_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."prune_activity_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prune_activity_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_push_on_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_push_on_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_push_on_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."activity_log_view" TO "anon";
GRANT ALL ON TABLE "public"."activity_log_view" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log_view" TO "service_role";



GRANT ALL ON TABLE "public"."question_templates" TO "anon";
GRANT ALL ON TABLE "public"."question_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."question_templates" TO "service_role";



GRANT ALL ON TABLE "public"."task_form_data" TO "anon";
GRANT ALL ON TABLE "public"."task_form_data" TO "authenticated";
GRANT ALL ON TABLE "public"."task_form_data" TO "service_role";



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."completed_tasks_with_form_data" TO "anon";
GRANT ALL ON TABLE "public"."completed_tasks_with_form_data" TO "authenticated";
GRANT ALL ON TABLE "public"."completed_tasks_with_form_data" TO "service_role";



GRANT ALL ON TABLE "public"."enclosure_count_history" TO "anon";
GRANT ALL ON TABLE "public"."enclosure_count_history" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosure_count_history" TO "service_role";



GRANT ALL ON TABLE "public"."enclosure_life_stage_history" TO "anon";
GRANT ALL ON TABLE "public"."enclosure_life_stage_history" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosure_life_stage_history" TO "service_role";



GRANT ALL ON TABLE "public"."enclosure_lineage" TO "anon";
GRANT ALL ON TABLE "public"."enclosure_lineage" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosure_lineage" TO "service_role";



GRANT ALL ON TABLE "public"."enclosure_schedules" TO "anon";
GRANT ALL ON TABLE "public"."enclosure_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosure_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."enclosure_sequences" TO "anon";
GRANT ALL ON TABLE "public"."enclosure_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosure_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."enclosures" TO "anon";
GRANT ALL ON TABLE "public"."enclosures" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosures" TO "service_role";



GRANT ALL ON TABLE "public"."org_species" TO "anon";
GRANT ALL ON TABLE "public"."org_species" TO "authenticated";
GRANT ALL ON TABLE "public"."org_species" TO "service_role";



GRANT ALL ON TABLE "public"."species" TO "anon";
GRANT ALL ON TABLE "public"."species" TO "authenticated";
GRANT ALL ON TABLE "public"."species" TO "service_role";



GRANT ALL ON TABLE "public"."tank_notes" TO "anon";
GRANT ALL ON TABLE "public"."tank_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."tank_notes" TO "service_role";



GRANT ALL ON TABLE "public"."enclosure_timeline" TO "anon";
GRANT ALL ON TABLE "public"."enclosure_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."enclosure_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."org_requests" TO "anon";
GRANT ALL ON TABLE "public"."org_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."org_requests" TO "service_role";



GRANT ALL ON TABLE "public"."orgs" TO "anon";
GRANT ALL ON TABLE "public"."orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."species_care_instructions" TO "anon";
GRANT ALL ON TABLE "public"."species_care_instructions" TO "authenticated";
GRANT ALL ON TABLE "public"."species_care_instructions" TO "service_role";



GRANT ALL ON TABLE "public"."species_requests" TO "anon";
GRANT ALL ON TABLE "public"."species_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."species_requests" TO "service_role";



GRANT ALL ON TABLE "public"."user_org_role" TO "anon";
GRANT ALL ON TABLE "public"."user_org_role" TO "authenticated";
GRANT ALL ON TABLE "public"."user_org_role" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW WHEN (((old.email)::text IS DISTINCT FROM (new.email)::text)) EXECUTE FUNCTION public.sync_profile_email();


  create policy "Authenticated users can view default care instructions"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'care_instructions'::text) AND (name ~~ 'default/%'::text)));



  create policy "Authenticated users can view species images"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'species_images'::text));



  create policy "Org members can delete org care instructions"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'care_instructions'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "Org members can update org care instructions"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'care_instructions'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)))
with check (((bucket_id = 'care_instructions'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "Org members can upload org care instructions"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'care_instructions'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "Org members can view org care instructions"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'care_instructions'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "Superadmins can delete default care instructions"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'care_instructions'::text) AND (name ~~ 'default/%'::text) AND public.is_superadmin()));



  create policy "Superadmins can delete species images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'species_images'::text) AND public.is_superadmin()));



  create policy "Superadmins can update default care instructions"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'care_instructions'::text) AND (name ~~ 'default/%'::text) AND public.is_superadmin()))
with check (((bucket_id = 'care_instructions'::text) AND (name ~~ 'default/%'::text) AND public.is_superadmin()));



  create policy "Superadmins can update species images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'species_images'::text) AND public.is_superadmin()))
with check (((bucket_id = 'species_images'::text) AND public.is_superadmin()));



  create policy "Superadmins can upload default care instructions"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'care_instructions'::text) AND (name ~~ 'default/%'::text) AND public.is_superadmin()));



  create policy "Superadmins can upload species images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'species_images'::text) AND public.is_superadmin()));



