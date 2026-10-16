-- Enterprise HRM KPI / Annual Performance Appraisal (ACR)
-- Step 2 of 2: functions for Competency Master, KPI Reference and Appraiser Mapping.
-- Run 01_kpi_acr_schema.sql first.

DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_competency_save(bigint, text, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_competency_datalist(text);
DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_reference_save(bigint, text, date, date, date, date, text, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_reference_datalist(text, numeric);
DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_reference_list();
DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_appraiser_mapping_save(bigint, bigint, bigint, bigint, numeric, numeric, text);
DROP FUNCTION IF EXISTS hrm_kpi.fn_kpi_appraiser_mapping_datalist(bigint, bigint);

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_competency_datalist(p_search text DEFAULT NULL)
RETURNS TABLE(competency_no bigint, competency_name text, description text, active_stat numeric)
LANGUAGE sql STABLE
AS $function$
    SELECT c.competency_no, c.competency_name, c.description, c.active_stat
    FROM hrm_kpi.kpi_competency c
    WHERE COALESCE(trim(p_search), '') = ''
       OR lower(c.competency_name) LIKE '%' || lower(trim(p_search)) || '%'
    ORDER BY c.active_stat DESC, c.competency_name;
$function$;

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_competency_save(
    p_competency_no bigint,
    p_competency_name text,
    p_description text,
    p_active_stat numeric,
    p_entryby numeric,
    p_entryip text
)
RETURNS TABLE(action_status numeric, message text, competency_no bigint)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_name text := trim(COALESCE(p_competency_name, ''));
    v_competency_no bigint;
BEGIN
    IF v_name = '' THEN
        RETURN QUERY SELECT 0::numeric, 'Please enter competency name.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM hrm_kpi.kpi_competency c
        WHERE lower(c.competency_name) = lower(v_name)
          AND c.competency_no <> COALESCE(p_competency_no, 0)
    ) THEN
        RETURN QUERY SELECT 0::numeric, 'Competency name already exists.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF COALESCE(p_competency_no, 0) = 0 THEN
        INSERT INTO hrm_kpi.kpi_competency (competency_name, description, active_stat, entryby, entryip)
        VALUES (v_name, NULLIF(trim(p_description), ''), COALESCE(p_active_stat, 1), p_entryby, p_entryip)
        RETURNING kpi_competency.competency_no INTO v_competency_no;

        RETURN QUERY SELECT 1::numeric, 'Competency saved successfully.'::text, v_competency_no;
    ELSE
        UPDATE hrm_kpi.kpi_competency c
        SET competency_name = v_name,
            description = NULLIF(trim(p_description), ''),
            active_stat = COALESCE(p_active_stat, c.active_stat),
            updateby = p_entryby,
            updateip = p_entryip,
            updatedate = now()
        WHERE c.competency_no = p_competency_no
        RETURNING c.competency_no INTO v_competency_no;

        IF v_competency_no IS NULL THEN
            RETURN QUERY SELECT 0::numeric, 'Competency not found.'::text, NULL::bigint;
        ELSE
            RETURN QUERY SELECT 2::numeric, 'Competency updated successfully.'::text, v_competency_no;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0::numeric, SQLERRM::text, NULL::bigint;
END;
$function$;

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_reference_datalist(p_search text DEFAULT NULL, p_active_stat numeric DEFAULT -1)
RETURNS TABLE(reference_no bigint, reference_code text, evaluation_from date, evaluation_to date,
              employee_due_date date, supervisor_due_date date, description text, active_stat numeric, cycle_status text)
LANGUAGE sql STABLE
AS $function$
    SELECT r.reference_no, r.reference_code, r.evaluation_from, r.evaluation_to,
           r.employee_due_date, r.supervisor_due_date, r.description, r.active_stat, r.cycle_status
    FROM hrm_kpi.kpi_reference r
    WHERE (COALESCE(p_active_stat, -1) = -1 OR r.active_stat = p_active_stat)
      AND (COALESCE(trim(p_search), '') = '' OR lower(r.reference_code) LIKE '%' || lower(trim(p_search)) || '%')
    ORDER BY r.evaluation_from DESC, r.reference_code DESC;
$function$;

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_reference_list()
RETURNS TABLE(reference_no bigint, reference_code text, evaluation_from date, evaluation_to date, employee_due_date date)
LANGUAGE sql STABLE
AS $function$
    SELECT r.reference_no, r.reference_code, r.evaluation_from, r.evaluation_to, r.employee_due_date
    FROM hrm_kpi.kpi_reference r
    WHERE r.active_stat = 1 AND r.cycle_status <> 'CLOSED'
    ORDER BY r.evaluation_from DESC, r.reference_code DESC;
$function$;

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_reference_save(
    p_reference_no bigint,
    p_reference_code text,
    p_evaluation_from date,
    p_evaluation_to date,
    p_employee_due_date date,
    p_supervisor_due_date date,
    p_description text,
    p_active_stat numeric,
    p_cycle_status text,
    p_entryby numeric,
    p_entryip text
)
RETURNS TABLE(action_status numeric, message text, reference_no bigint)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_code text := trim(COALESCE(p_reference_code, ''));
    v_status text := upper(trim(COALESCE(p_cycle_status, 'DRAFT')));
    v_reference_no bigint;
BEGIN
    IF v_code = '' OR p_evaluation_from IS NULL OR p_evaluation_to IS NULL OR p_employee_due_date IS NULL THEN
        RETURN QUERY SELECT 0::numeric, 'Reference no, evaluation period and employee due date are required.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF p_evaluation_to < p_evaluation_from OR p_employee_due_date < p_evaluation_from THEN
        RETURN QUERY SELECT 0::numeric, 'Please enter valid appraisal dates.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF p_supervisor_due_date IS NOT NULL AND p_supervisor_due_date < p_employee_due_date THEN
        RETURN QUERY SELECT 0::numeric, 'Supervisor due date cannot be before employee due date.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF v_status NOT IN ('DRAFT', 'OPEN', 'CLOSED') THEN
        RETURN QUERY SELECT 0::numeric, 'Invalid cycle status.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM hrm_kpi.kpi_reference r
        WHERE lower(r.reference_code) = lower(v_code)
          AND r.reference_no <> COALESCE(p_reference_no, 0)
    ) THEN
        RETURN QUERY SELECT 0::numeric, 'KPI reference already exists.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF COALESCE(p_reference_no, 0) = 0 THEN
        INSERT INTO hrm_kpi.kpi_reference (
            reference_code, evaluation_from, evaluation_to, employee_due_date, supervisor_due_date,
            description, active_stat, cycle_status, entryby, entryip
        ) VALUES (
            v_code, p_evaluation_from, p_evaluation_to, p_employee_due_date, p_supervisor_due_date,
            NULLIF(trim(p_description), ''), COALESCE(p_active_stat, 1), v_status, p_entryby, p_entryip
        ) RETURNING kpi_reference.reference_no INTO v_reference_no;

        RETURN QUERY SELECT 1::numeric, 'KPI reference saved successfully.'::text, v_reference_no;
    ELSE
        UPDATE hrm_kpi.kpi_reference r
        SET reference_code = v_code,
            evaluation_from = p_evaluation_from,
            evaluation_to = p_evaluation_to,
            employee_due_date = p_employee_due_date,
            supervisor_due_date = p_supervisor_due_date,
            description = NULLIF(trim(p_description), ''),
            active_stat = COALESCE(p_active_stat, r.active_stat),
            cycle_status = v_status,
            updateby = p_entryby,
            updateip = p_entryip,
            updatedate = now()
        WHERE r.reference_no = p_reference_no
        RETURNING r.reference_no INTO v_reference_no;

        IF v_reference_no IS NULL THEN
            RETURN QUERY SELECT 0::numeric, 'KPI reference not found.'::text, NULL::bigint;
        ELSE
            RETURN QUERY SELECT 2::numeric, 'KPI reference updated successfully.'::text, v_reference_no;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0::numeric, SQLERRM::text, NULL::bigint;
END;
$function$;

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_appraiser_mapping_datalist(p_reference_no bigint, p_employee_no bigint DEFAULT -1)
RETURNS TABLE(mapping_no bigint, reference_no bigint, employee_no bigint, appraiser_employee_no bigint, active_stat numeric)
LANGUAGE sql STABLE
AS $function$
    SELECT m.mapping_no, m.reference_no, m.employee_no, m.appraiser_employee_no, m.active_stat
    FROM hrm_kpi.kpi_appraiser_mapping m
    WHERE m.reference_no = p_reference_no
      AND (COALESCE(p_employee_no, -1) = -1 OR m.employee_no = p_employee_no)
    ORDER BY m.active_stat DESC, m.employee_no;
$function$;

CREATE OR REPLACE FUNCTION hrm_kpi.fn_kpi_appraiser_mapping_save(
    p_mapping_no bigint,
    p_reference_no bigint,
    p_employee_no bigint,
    p_appraiser_employee_no bigint,
    p_active_stat numeric,
    p_entryby numeric,
    p_entryip text
)
RETURNS TABLE(action_status numeric, message text, mapping_no bigint)
LANGUAGE plpgsql
AS $function$
DECLARE v_mapping_no bigint;
BEGIN
    IF p_reference_no IS NULL OR p_employee_no IS NULL OR p_appraiser_employee_no IS NULL THEN
        RETURN QUERY SELECT 0::numeric, 'KPI reference, employee and appraiser are required.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF p_employee_no = p_appraiser_employee_no THEN
        RETURN QUERY SELECT 0::numeric, 'Employee and appraiser cannot be the same.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM hrm_kpi.kpi_reference r
        WHERE r.reference_no = p_reference_no
    ) THEN
        RETURN QUERY SELECT 0::numeric, 'KPI reference not found.'::text, NULL::bigint;
        RETURN;
    END IF;

    IF COALESCE(p_mapping_no, 0) = 0 THEN
        INSERT INTO hrm_kpi.kpi_appraiser_mapping (
            reference_no, employee_no, appraiser_employee_no, active_stat, entryby, entryip
        ) VALUES (
            p_reference_no, p_employee_no, p_appraiser_employee_no, COALESCE(p_active_stat, 1), p_entryby, p_entryip
        ) RETURNING kpi_appraiser_mapping.mapping_no INTO v_mapping_no;

        RETURN QUERY SELECT 1::numeric, 'Appraiser mapping saved successfully.'::text, v_mapping_no;
    ELSE
        UPDATE hrm_kpi.kpi_appraiser_mapping m
        SET reference_no = p_reference_no,
            employee_no = p_employee_no,
            appraiser_employee_no = p_appraiser_employee_no,
            active_stat = COALESCE(p_active_stat, m.active_stat),
            updateby = p_entryby,
            updateip = p_entryip,
            updatedate = now()
        WHERE m.mapping_no = p_mapping_no
        RETURNING m.mapping_no INTO v_mapping_no;

        IF v_mapping_no IS NULL THEN
            RETURN QUERY SELECT 0::numeric, 'Appraiser mapping not found.'::text, NULL::bigint;
        ELSE
            RETURN QUERY SELECT 2::numeric, 'Appraiser mapping updated successfully.'::text, v_mapping_no;
        END IF;
    END IF;
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 0::numeric, 'An active appraiser is already mapped for this employee and KPI reference.'::text, NULL::bigint;
WHEN OTHERS THEN
    RETURN QUERY SELECT 0::numeric, SQLERRM::text, NULL::bigint;
END;
$function$;

