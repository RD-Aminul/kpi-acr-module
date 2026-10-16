-- Enterprise HRM KPI / Annual Performance Appraisal (ACR)
-- Step 3 of 3: Functions for ACR Form, Employee Self-Appraisal & Supervisor Evaluation.
-- Prerequisites: Run 01_kpi_acr_schema.sql and 02_kpi_acr_setup_functions.sql first.
-- Schema: hrm_kpi

DROP FUNCTION IF EXISTS hrm_kpi.fn_acr_master_datalist(bigint, bigint, text, text);
DROP FUNCTION IF EXISTS hrm_kpi.fn_acr_form_data(bigint, bigint);
DROP FUNCTION IF EXISTS hrm_kpi.fn_acr_employee_save(bigint, bigint, bigint, text, text, text, text, numeric, text);
DROP FUNCTION IF EXISTS hrm_kpi.fn_acr_supervisor_save(bigint, bigint, bigint, text, text, text, text, text, text, text, text, text, numeric, text);

-- ---------------------------------------------------------------------------------------------
-- 1. ACR List for Employee / Supervisor Dashboard
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hrm_kpi.fn_acr_master_datalist(
    p_reference_no bigint DEFAULT -1,
    p_employee_no bigint DEFAULT -1,
    p_role text DEFAULT 'ALL', -- 'EMPLOYEE', 'SUPERVISOR', 'ALL'
    p_status text DEFAULT NULL
)
RETURNS TABLE(
    acr_no bigint,
    reference_no bigint,
    reference_code text,
    evaluation_from date,
    evaluation_to date,
    employee_due_date date,
    supervisor_due_date date,
    employee_no bigint,
    appraiser_employee_no bigint,
    submission_status text,
    employee_submitted_at timestamp without time zone,
    supervisor_submitted_at timestamp without time zone,
    supervisor_performance text,
    whole_performance text,
    final_decision text
)
LANGUAGE sql STABLE
AS $function$
    SELECT 
        a.acr_no,
        r.reference_no,
        r.reference_code,
        r.evaluation_from,
        r.evaluation_to,
        r.employee_due_date,
        r.supervisor_due_date,
        a.employee_no,
        a.appraiser_employee_no,
        a.submission_status,
        a.employee_submitted_at,
        a.supervisor_submitted_at,
        a.supervisor_performance,
        a.whole_performance,
        a.final_decision
    FROM hrm_kpi.acr_master a
    JOIN hrm_kpi.kpi_reference r ON a.reference_no = r.reference_no
    WHERE (COALESCE(p_reference_no, -1) = -1 OR a.reference_no = p_reference_no)
      AND (
          upper(COALESCE(p_role, 'ALL')) = 'ALL'
          OR (upper(p_role) = 'EMPLOYEE' AND a.employee_no = p_employee_no)
          OR (upper(p_role) = 'SUPERVISOR' AND a.appraiser_employee_no = p_employee_no)
      )
      AND (COALESCE(trim(p_status), '') = '' OR a.submission_status = upper(trim(p_status)))
    ORDER BY a.acr_no DESC;
$function$;

-- ---------------------------------------------------------------------------------------------
-- 2. Get Full ACR Form Data (Master + Activities + Competencies + Needs + Targets)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hrm_kpi.fn_acr_form_data(
    p_reference_no bigint,
    p_employee_no bigint
)
RETURNS TABLE(
    acr_json jsonb
)
LANGUAGE plpgsql STABLE
AS $function$
DECLARE
    v_acr_no bigint;
    v_appraiser_no bigint;
    v_status text;
BEGIN
    -- Check if record already exists in acr_master
    SELECT a.acr_no, a.appraiser_employee_no, a.submission_status
    INTO v_acr_no, v_appraiser_no, v_status
    FROM hrm_kpi.acr_master a
    WHERE a.reference_no = p_reference_no AND a.employee_no = p_employee_no;

    -- If not yet created in acr_master, find mapped appraiser from mapping table
    IF v_acr_no IS NULL THEN
        SELECT m.appraiser_employee_no
        INTO v_appraiser_no
        FROM hrm_kpi.kpi_appraiser_mapping m
        WHERE m.reference_no = p_reference_no 
          AND m.employee_no = p_employee_no 
          AND m.active_stat = 1
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT jsonb_build_object(
        'acr_no', COALESCE(v_acr_no, 0),
        'reference_no', r.reference_no,
        'reference_code', r.reference_code,
        'evaluation_from', r.evaluation_from,
        'evaluation_to', r.evaluation_to,
        'employee_due_date', r.employee_due_date,
        'supervisor_due_date', r.supervisor_due_date,
        'employee_no', p_employee_no,
        'appraiser_employee_no', v_appraiser_no,
        'submission_status', COALESCE(v_status, 'DRAFT'),
        'supervisor_performance', m.supervisor_performance,
        'supervisor_explanation', m.supervisor_explanation,
        'whole_performance', m.whole_performance,
        'final_decision', m.final_decision,
        'final_remarks', m.final_remarks,
        'activities', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'activity_no', act.activity_no,
                    'activity_description', act.activity_description,
                    'employee_achievement_percent', act.employee_achievement_percent,
                    'supervisor_achievement_percent', act.supervisor_achievement_percent,
                    'supervisor_comment', act.supervisor_comment,
                    'display_order', act.display_order
                ) ORDER BY act.display_order, act.activity_no
            ), '[]'::jsonb)
            FROM hrm_kpi.acr_activity act
            WHERE act.acr_no = v_acr_no
        ),
        'competencies', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'competency_no', c.competency_no,
                    'competency_name', c.competency_name,
                    'description', c.description,
                    'rating_no', cr.rating_no,
                    'employee_rating', cr.employee_rating,
                    'supervisor_rating', cr.supervisor_rating,
                    'supervisor_comment', cr.supervisor_comment
                ) ORDER BY c.competency_name
            ), '[]'::jsonb)
            FROM hrm_kpi.kpi_competency c
            LEFT JOIN hrm_kpi.acr_competency_rating cr 
                ON c.competency_no = cr.competency_no AND cr.acr_no = v_acr_no
            WHERE c.active_stat = 1
        ),
        'development_needs', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'development_no', dn.development_no,
                    'area_to_improve', dn.area_to_improve,
                    'action_required', dn.action_required,
                    'responsible_person', dn.responsible_person,
                    'target_deadline', dn.target_deadline,
                    'supervisor_comment', dn.supervisor_comment,
                    'display_order', dn.display_order
                ) ORDER BY dn.display_order, dn.development_no
            ), '[]'::jsonb)
            FROM hrm_kpi.acr_development_need dn
            WHERE dn.acr_no = v_acr_no
        ),
        'next_year_targets', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'target_no', t.target_no,
                    'target_description', t.target_description,
                    'supervisor_comment', t.supervisor_comment,
                    'display_order', t.display_order
                ) ORDER BY t.display_order, t.target_no
            ), '[]'::jsonb)
            FROM hrm_kpi.acr_next_year_target t
            WHERE t.acr_no = v_acr_no
        )
    )
    FROM hrm_kpi.kpi_reference r
    LEFT JOIN hrm_kpi.acr_master m ON m.acr_no = v_acr_no
    WHERE r.reference_no = p_reference_no;
END;
$function$;

-- ---------------------------------------------------------------------------------------------
-- 3. Save / Submit Employee Self-Appraisal Form
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hrm_kpi.fn_acr_employee_save(
    p_reference_no bigint,
    p_employee_no bigint,
    p_appraiser_employee_no bigint,
    p_action_type text, -- 'DRAFT' or 'SUBMIT'
    p_activities_json text,
    p_competencies_json text,
    p_development_needs_json text,
    p_entryby numeric,
    p_entryip text
)
RETURNS TABLE(action_status numeric, message text, acr_no bigint)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
DECLARE
    v_acr_no bigint;
    v_curr_status text;
    v_appraiser_no bigint := p_appraiser_employee_no;
    v_act jsonb;
    v_comp jsonb;
    v_dev jsonb;
BEGIN
    -- Check cycle
    IF NOT EXISTS (
        SELECT 1 FROM hrm_kpi.kpi_reference 
        WHERE reference_no = p_reference_no AND active_stat = 1 AND cycle_status = 'OPEN'
    ) THEN
        RETURN QUERY SELECT 0::numeric, 'KPI reference cycle is not open for submission.'::text, NULL::bigint;
        RETURN;
    END IF;

    -- Check mapped appraiser if not provided
    IF COALESCE(v_appraiser_no, 0) = 0 THEN
        SELECT appraiser_employee_no INTO v_appraiser_no
        FROM hrm_kpi.kpi_appraiser_mapping
        WHERE reference_no = p_reference_no AND employee_no = p_employee_no AND active_stat = 1
        LIMIT 1;
    END IF;

    IF COALESCE(v_appraiser_no, 0) = 0 THEN
        RETURN QUERY SELECT 0::numeric, 'No active appraiser mapped for this employee in this KPI cycle.'::text, NULL::bigint;
        RETURN;
    END IF;

    -- Check existing ACR master
    SELECT m.acr_no, m.submission_status INTO v_acr_no, v_curr_status
    FROM hrm_kpi.acr_master m
    WHERE m.reference_no = p_reference_no AND m.employee_no = p_employee_no;

    IF v_curr_status IS NOT NULL AND v_curr_status NOT IN ('DRAFT', 'RETURNED') THEN
        RETURN QUERY SELECT 0::numeric, 'Appraisal form has already been submitted and cannot be edited.'::text, v_acr_no;
        RETURN;
    END IF;

    -- Upsert Master
    IF v_acr_no IS NULL THEN
        INSERT INTO hrm_kpi.acr_master (
            reference_no, employee_no, appraiser_employee_no, submission_status,
            employee_submitted_at, entryby, entryip
        ) VALUES (
            p_reference_no, p_employee_no, v_appraiser_no,
            CASE WHEN upper(p_action_type) = 'SUBMIT' THEN 'EMPLOYEE_SUBMITTED' ELSE 'DRAFT' END,
            CASE WHEN upper(p_action_type) = 'SUBMIT' THEN now() ELSE NULL END,
            p_entryby, p_entryip
        ) RETURNING acr_master.acr_no INTO v_acr_no;
    ELSE
        UPDATE hrm_kpi.acr_master
        SET appraiser_employee_no = v_appraiser_no,
            submission_status = CASE WHEN upper(p_action_type) = 'SUBMIT' THEN 'EMPLOYEE_SUBMITTED' ELSE 'DRAFT' END,
            employee_submitted_at = CASE WHEN upper(p_action_type) = 'SUBMIT' THEN now() ELSE employee_submitted_at END,
            updateby = p_entryby,
            updateip = p_entryip,
            updatedate = now()
        WHERE acr_master.acr_no = v_acr_no;
    END IF;

    -- Replace Activities
    DELETE FROM hrm_kpi.acr_activity WHERE acr_activity.acr_no = v_acr_no;
    IF p_activities_json IS NOT NULL AND trim(p_activities_json) <> '' THEN
        FOR v_act IN SELECT * FROM jsonb_array_elements(p_activities_json::jsonb)
        LOOP
            IF trim(COALESCE(v_act->>'activity_description', '')) <> '' THEN
                INSERT INTO hrm_kpi.acr_activity (
                    acr_no, activity_description, employee_achievement_percent, display_order
                ) VALUES (
                    v_acr_no,
                    trim(v_act->>'activity_description'),
                    (v_act->>'employee_achievement_percent')::numeric,
                    COALESCE((v_act->>'display_order')::integer, 1)
                );
            END IF;
        END LOOP;
    END IF;

    -- Upsert Competencies
    IF p_competencies_json IS NOT NULL AND trim(p_competencies_json) <> '' THEN
        FOR v_comp IN SELECT * FROM jsonb_array_elements(p_competencies_json::jsonb)
        LOOP
            IF (v_comp->>'competency_no') IS NOT NULL THEN
                INSERT INTO hrm_kpi.acr_competency_rating (
                    acr_no, competency_no, employee_rating
                ) VALUES (
                    v_acr_no,
                    (v_comp->>'competency_no')::bigint,
                    NULLIF(trim(v_comp->>'employee_rating'), '')
                )
                ON CONFLICT ON CONSTRAINT uq_acr_competency_rating
                DO UPDATE SET employee_rating = EXCLUDED.employee_rating;
            END IF;
        END LOOP;
    END IF;

    -- Replace Development Needs
    DELETE FROM hrm_kpi.acr_development_need WHERE acr_development_need.acr_no = v_acr_no;
    IF p_development_needs_json IS NOT NULL AND trim(p_development_needs_json) <> '' THEN
        FOR v_dev IN SELECT * FROM jsonb_array_elements(p_development_needs_json::jsonb)
        LOOP
            IF trim(COALESCE(v_dev->>'area_to_improve', '')) <> '' THEN
                INSERT INTO hrm_kpi.acr_development_need (
                    acr_no, area_to_improve, action_required, responsible_person, target_deadline, display_order
                ) VALUES (
                    v_acr_no,
                    trim(v_dev->>'area_to_improve'),
                    NULLIF(trim(v_dev->>'action_required'), ''),
                    NULLIF(trim(v_dev->>'responsible_person'), ''),
                    NULLIF(trim(v_dev->>'target_deadline'), '')::date,
                    COALESCE((v_dev->>'display_order')::integer, 1)
                );
            END IF;
        END LOOP;
    END IF;

    -- History entry if submitted
    IF upper(p_action_type) = 'SUBMIT' THEN
        INSERT INTO hrm_kpi.acr_approval_history (
            acr_no, action_by, action_role, action_type, remarks
        ) VALUES (
            v_acr_no, p_entryby, 'EMPLOYEE', 'SUBMIT', 'Employee submitted self-appraisal form.'
        );
    END IF;

    RETURN QUERY SELECT 
        1::numeric, 
        CASE WHEN upper(p_action_type) = 'SUBMIT' THEN 'Appraisal form submitted successfully.' ELSE 'Appraisal form draft saved successfully.' END::text,
        v_acr_no;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0::numeric, SQLERRM::text, NULL::bigint;
END;
$function$;

-- ---------------------------------------------------------------------------------------------
-- 4. Save / Submit Supervisor Evaluation & Final Decision
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hrm_kpi.fn_acr_supervisor_save(
    p_acr_no bigint,
    p_reference_no bigint,
    p_employee_no bigint,
    p_action_type text, -- 'DRAFT', 'SUBMIT', 'RETURN'
    p_supervisor_performance text,
    p_supervisor_explanation text,
    p_whole_performance text,
    p_final_decision text,
    p_final_remarks text,
    p_activities_json text,
    p_competencies_json text,
    p_targets_json text,
    p_entryby numeric,
    p_entryip text
)
RETURNS TABLE(action_status numeric, message text, acr_no bigint)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
DECLARE
    v_acr_no bigint := p_acr_no;
    v_act jsonb;
    v_comp jsonb;
    v_target jsonb;
BEGIN
    IF COALESCE(v_acr_no, 0) = 0 THEN
        SELECT m.acr_no INTO v_acr_no
        FROM hrm_kpi.acr_master m
        WHERE m.reference_no = p_reference_no AND m.employee_no = p_employee_no;
    END IF;

    IF v_acr_no IS NULL THEN
        RETURN QUERY SELECT 0::numeric, 'ACR record not found.'::text, NULL::bigint;
        RETURN;
    END IF;

    -- Update Supervisor part in Master
    UPDATE hrm_kpi.acr_master
    SET supervisor_performance = NULLIF(trim(p_supervisor_performance), ''),
        supervisor_explanation = NULLIF(trim(p_supervisor_explanation), ''),
        whole_performance = NULLIF(trim(p_whole_performance), ''),
        final_decision = NULLIF(trim(p_final_decision), ''),
        final_remarks = NULLIF(trim(p_final_remarks), ''),
        submission_status = CASE 
            WHEN upper(p_action_type) = 'SUBMIT' THEN 'SUPERVISOR_SUBMITTED'
            WHEN upper(p_action_type) = 'RETURN' THEN 'RETURNED'
            ELSE submission_status
        END,
        supervisor_submitted_at = CASE WHEN upper(p_action_type) = 'SUBMIT' THEN now() ELSE supervisor_submitted_at END,
        updateby = p_entryby,
        updateip = p_entryip,
        updatedate = now()
    WHERE acr_master.acr_no = v_acr_no;

    -- Update Activity Supervisor percent & comment
    IF p_activities_json IS NOT NULL AND trim(p_activities_json) <> '' THEN
        FOR v_act IN SELECT * FROM jsonb_array_elements(p_activities_json::jsonb)
        LOOP
            IF (v_act->>'activity_no') IS NOT NULL THEN
                UPDATE hrm_kpi.acr_activity
                SET supervisor_achievement_percent = (v_act->>'supervisor_achievement_percent')::numeric,
                    supervisor_comment = NULLIF(trim(v_act->>'supervisor_comment'), '')
                WHERE activity_no = (v_act->>'activity_no')::bigint AND acr_activity.acr_no = v_acr_no;
            END IF;
        END LOOP;
    END IF;

    -- Update Competency Supervisor rating & comment
    IF p_competencies_json IS NOT NULL AND trim(p_competencies_json) <> '' THEN
        FOR v_comp IN SELECT * FROM jsonb_array_elements(p_competencies_json::jsonb)
        LOOP
            IF (v_comp->>'competency_no') IS NOT NULL THEN
                INSERT INTO hrm_kpi.acr_competency_rating (
                    acr_no, competency_no, supervisor_rating, supervisor_comment
                ) VALUES (
                    v_acr_no,
                    (v_comp->>'competency_no')::bigint,
                    NULLIF(trim(v_comp->>'supervisor_rating'), ''),
                    NULLIF(trim(v_comp->>'supervisor_comment'), '')
                )
                ON CONFLICT ON CONSTRAINT uq_acr_competency_rating
                DO UPDATE SET 
                    supervisor_rating = EXCLUDED.supervisor_rating,
                    supervisor_comment = EXCLUDED.supervisor_comment;
            END IF;
        END LOOP;
    END IF;

    -- Replace Next Year Targets
    DELETE FROM hrm_kpi.acr_next_year_target WHERE acr_next_year_target.acr_no = v_acr_no;
    IF p_targets_json IS NOT NULL AND trim(p_targets_json) <> '' THEN
        FOR v_target IN SELECT * FROM jsonb_array_elements(p_targets_json::jsonb)
        LOOP
            IF trim(COALESCE(v_target->>'target_description', '')) <> '' THEN
                INSERT INTO hrm_kpi.acr_next_year_target (
                    acr_no, target_description, supervisor_comment, display_order
                ) VALUES (
                    v_acr_no,
                    trim(v_target->>'target_description'),
                    NULLIF(trim(v_target->>'supervisor_comment'), ''),
                    COALESCE((v_target->>'display_order')::integer, 1)
                );
            END IF;
        END LOOP;
    END IF;

    -- Log Approval History
    INSERT INTO hrm_kpi.acr_approval_history (
        acr_no, action_by, action_role, action_type, remarks
    ) VALUES (
        v_acr_no, 
        p_entryby, 
        'SUPERVISOR', 
        CASE WHEN upper(p_action_type) = 'SUBMIT' THEN 'SUBMIT' WHEN upper(p_action_type) = 'RETURN' THEN 'RETURN' ELSE 'REVIEW' END,
        CASE WHEN upper(p_action_type) = 'RETURN' THEN COALESCE(p_final_remarks, 'Appraisal form returned to employee.') ELSE 'Supervisor updated evaluation.' END
    );

    RETURN QUERY SELECT 
        1::numeric, 
        CASE 
            WHEN upper(p_action_type) = 'SUBMIT' THEN 'Supervisor evaluation submitted successfully.'
            WHEN upper(p_action_type) = 'RETURN' THEN 'Appraisal form returned to employee successfully.'
            ELSE 'Supervisor evaluation saved successfully.' 
        END::text,
        v_acr_no;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0::numeric, SQLERRM::text, NULL::bigint;
END;
$function$;

