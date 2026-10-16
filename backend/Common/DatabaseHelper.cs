namespace Enterprise.HRM.KPI.Common;

public static class DatabasePackage
{
    public static string PG_PACKAGE_NAME { get; set; } = "hrm_kpi";
}

public static class DBFunctionName
{
    public static readonly string fn_kpi_competency_datalist = "fn_kpi_competency_datalist";
    public static readonly string fn_kpi_competency_save = "fn_kpi_competency_save";
    public static readonly string fn_kpi_reference_datalist = "fn_kpi_reference_datalist";
    public static readonly string fn_kpi_reference_list = "fn_kpi_reference_list";
    public static readonly string fn_kpi_reference_save = "fn_kpi_reference_save";
    public static readonly string fn_kpi_appraiser_mapping_datalist = "fn_kpi_appraiser_mapping_datalist";
    public static readonly string fn_kpi_appraiser_mapping_save = "fn_kpi_appraiser_mapping_save";
    public static readonly string fn_acr_master_datalist = "fn_acr_master_datalist";
    public static readonly string fn_acr_form_data = "fn_acr_form_data";
    public static readonly string fn_acr_employee_save = "fn_acr_employee_save";
    public static readonly string fn_acr_supervisor_save = "fn_acr_supervisor_save";
    public static readonly string fn_acr_hr_save = "fn_acr_hr_save";
}
