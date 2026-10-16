-- Enterprise HRM KPI / ACR Menu Registration Script
-- Run this script in PostgreSQL (hrm_kpi) to register the menus in the system menu table.
-- Schema: hrm_kpi

-- 1. Check parent menu ID for HRM Setup and HRM Entry/Process:
-- SELECT menuid, menuname, menupath, parentmenuid FROM hrm_kpi.sys_menu WHERE menuname ILIKE '%HRM%' OR menuname ILIKE '%Setup%';

-- Sample insert (adjust parentmenuid and moduleid according to your sys_menu table):
/*
INSERT INTO hrm_kpi.sys_menu (menuname, menupath, orderno, isactive, entryby, entrydate)
VALUES 
    ('Competency Master', '/KpiCompetency', 101, 1, 1, now()),
    ('KPI Reference Setup', '/KpiReference', 102, 1, 1, now()),
    ('Appraiser Mapping', '/KpiAppraiserMapping', 103, 1, 1, now()),
    ('Annual Performance Appraisal (ACR)', '/PerformanceAppraisalForm', 104, 1, 1, now());
*/

