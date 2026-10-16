using Dapper;
using Enterprise.HRM.KPI.Common;
using Enterprise.HRM.KPI.Interfaces;
using Enterprise.HRM.KPI.Requests;
using Enterprise.HRM.KPI.Responses;

using Npgsql;
using System.Text.Json;

namespace Enterprise.HRM.KPI.Repositories
{
    public class KpiAcrRepositories : IKpiAcrRepositories
    {
        private readonly string _connectionString;

        public KpiAcrRepositories(string connectionString)
        {
            _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        }

        #region Competency Master
        public async Task<ApiResponse<List<object>>> GetCompetencyDataList(KpiCompetencyRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_competency_datalist}(@p_search::text);";
                var result = (await conn.QueryAsync<object>(sql, new
                {
                    p_search = string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim()
                })).ToList();

                if (!result.Any())
                    return ApiResponse<List<object>>.Fail("No data found");

                return ApiResponse<List<object>>.Success(result);
            }
            catch (Exception ex)
            {
                return ApiResponse<List<object>>.Fail($"Error fetching competency data: {ex.Message}");
            }
        }

        public async Task<ApiResponse<KpiSaveResponse>> SaveCompetency(KpiCompetencySaveRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"
                    SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_competency_save}(
                        @p_competency_no::bigint,
                        @p_competency_name::text,
                        @p_description::text,
                        @p_active_stat::numeric,
                        @p_entryby::numeric,
                        @p_entryip::text
                    );
                ";

                var parameters = new
                {
                    p_competency_no = request.CompetencyNo ?? 0,
                    p_competency_name = request.CompetencyName?.Trim(),
                    p_description = request.Description?.Trim(),
                    p_active_stat = request.ActiveStat ?? 1,
                    p_entryby = request.EntryBy,
                    p_entryip = request.EntryIp?.Trim()
                };

                var result = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, parameters);
                if (result == null)
                    return ApiResponse<KpiSaveResponse>.Fail("No response returned from database");

                if (result.action_status > 0)
                    return ApiResponse<KpiSaveResponse>.Success(result);

                return ApiResponse<KpiSaveResponse>.Fail(result.message ?? "Save failed");
            }
            catch (Exception ex)
            {
                return ApiResponse<KpiSaveResponse>.Fail($"Error saving competency: {ex.Message}");
            }
        }
        #endregion

        #region KPI Reference
        public async Task<ApiResponse<List<object>>> GetReferenceDataList(KpiReferenceRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_reference_datalist}(@p_search::text, @p_active_stat::numeric);";
                var result = (await conn.QueryAsync<object>(sql, new
                {
                    p_search = string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim(),
                    p_active_stat = request.ActiveStat ?? -1
                })).ToList();

                if (!result.Any())
                    return ApiResponse<List<object>>.Fail("No data found");

                return ApiResponse<List<object>>.Success(result);
            }
            catch (Exception ex)
            {
                return ApiResponse<List<object>>.Fail($"Error fetching reference data: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<object>>> GetReferenceList()
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_reference_list}();";
                var result = (await conn.QueryAsync<object>(sql)).ToList();

                if (!result.Any())
                    return ApiResponse<List<object>>.Fail("No active reference cycle found");

                return ApiResponse<List<object>>.Success(result);
            }
            catch (Exception ex)
            {
                return ApiResponse<List<object>>.Fail($"Error fetching reference list: {ex.Message}");
            }
        }

        public async Task<ApiResponse<KpiSaveResponse>> SaveReference(KpiReferenceSaveRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"
                    SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_reference_save}(
                        @p_reference_no::bigint,
                        @p_reference_code::text,
                        @p_evaluation_from::date,
                        @p_evaluation_to::date,
                        @p_employee_due_date::date,
                        @p_supervisor_due_date::date,
                        @p_description::text,
                        @p_active_stat::numeric,
                        @p_cycle_status::text,
                        @p_entryby::numeric,
                        @p_entryip::text
                    );
                ";

                var parameters = new
                {
                    p_reference_no = request.ReferenceNo ?? 0,
                    p_reference_code = request.ReferenceCode?.Trim(),
                    p_evaluation_from = request.EvaluationFrom,
                    p_evaluation_to = request.EvaluationTo,
                    p_employee_due_date = request.EmployeeDueDate,
                    p_supervisor_due_date = request.SupervisorDueDate,
                    p_description = request.Description?.Trim(),
                    p_active_stat = request.ActiveStat ?? 1,
                    p_cycle_status = request.CycleStatus?.Trim() ?? "DRAFT",
                    p_entryby = request.EntryBy,
                    p_entryip = request.EntryIp?.Trim()
                };

                var result = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, parameters);
                if (result == null)
                    return ApiResponse<KpiSaveResponse>.Fail("No response returned from database");

                if (result.action_status > 0)
                    return ApiResponse<KpiSaveResponse>.Success(result);

                return ApiResponse<KpiSaveResponse>.Fail(result.message ?? "Save failed");
            }
            catch (Exception ex)
            {
                return ApiResponse<KpiSaveResponse>.Fail($"Error saving reference: {ex.Message}");
            }
        }
        #endregion

        #region Appraiser Mapping
        public async Task<ApiResponse<List<object>>> GetAppraiserMappingDataList(KpiAppraiserMappingRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_appraiser_mapping_datalist}(@p_reference_no::bigint, @p_employee_no::bigint);";
                var result = (await conn.QueryAsync<object>(sql, new
                {
                    p_reference_no = request.ReferenceNo,
                    p_employee_no = request.EmployeeNo ?? -1
                })).ToList();

                if (!result.Any())
                    return ApiResponse<List<object>>.Fail("No mapping data found");

                return ApiResponse<List<object>>.Success(result);
            }
            catch (Exception ex)
            {
                return ApiResponse<List<object>>.Fail($"Error fetching mapping data: {ex.Message}");
            }
        }

        public async Task<ApiResponse<KpiSaveResponse>> SaveAppraiserMapping(KpiAppraiserMappingSaveRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"
                    SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_kpi_appraiser_mapping_save}(
                        @p_mapping_no::bigint,
                        @p_reference_no::bigint,
                        @p_employee_no::bigint,
                        @p_appraiser_employee_no::bigint,
                        @p_active_stat::numeric,
                        @p_entryby::numeric,
                        @p_entryip::text
                    );
                ";

                // If multiple employees provided (Multi-Select)
                if (request.EmployeeNos != null && request.EmployeeNos.Any())
                {
                    int successCount = 0;
                    foreach (var empNo in request.EmployeeNos)
                    {
                        if (empNo == request.AppraiserEmployeeNo) continue; // Skip same person

                        var res = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, new
                        {
                            p_mapping_no = 0L,
                            p_reference_no = request.ReferenceNo,
                            p_employee_no = empNo,
                            p_appraiser_employee_no = request.AppraiserEmployeeNo,
                            p_active_stat = request.ActiveStat ?? 1,
                            p_entryby = request.EntryBy,
                            p_entryip = request.EntryIp?.Trim()
                        });

                        if (res != null && res.action_status > 0) successCount++;
                    }

                    return ApiResponse<KpiSaveResponse>.Success(new KpiSaveResponse
                    {
                        action_status = 1,
                        message = $"{successCount} employee mapping(s) saved successfully.",
                        reference_no = request.ReferenceNo
                    });
                }

                // Single employee edit/save
                var parameters = new
                {
                    p_mapping_no = request.MappingNo ?? 0,
                    p_reference_no = request.ReferenceNo,
                    p_employee_no = request.EmployeeNo ?? 0,
                    p_appraiser_employee_no = request.AppraiserEmployeeNo,
                    p_active_stat = request.ActiveStat ?? 1,
                    p_entryby = request.EntryBy,
                    p_entryip = request.EntryIp?.Trim()
                };

                var result = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, parameters);
                if (result == null)
                    return ApiResponse<KpiSaveResponse>.Fail("No response returned from database");

                if (result.action_status > 0)
                    return ApiResponse<KpiSaveResponse>.Success(result);

                return ApiResponse<KpiSaveResponse>.Fail(result.message ?? "Save failed");
            }
            catch (Exception ex)
            {
                return ApiResponse<KpiSaveResponse>.Fail($"Error saving appraiser mapping: {ex.Message}");
            }
        }
        #endregion

        #region ACR Form & Evaluation
        public async Task<ApiResponse<List<object>>> GetAcrMasterList(AcrMasterListRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_acr_master_datalist}(
                    @p_reference_no::bigint, @p_employee_no::bigint, @p_role::text, @p_status::text);";

                var result = (await conn.QueryAsync<object>(sql, new
                {
                    p_reference_no = request.ReferenceNo ?? -1,
                    p_employee_no = request.EmployeeNo ?? -1,
                    p_role = string.IsNullOrWhiteSpace(request.Role) ? "ALL" : request.Role.Trim(),
                    p_status = string.IsNullOrWhiteSpace(request.Status) ? null : request.Status.Trim()
                })).ToList();

                if (!result.Any())
                    return ApiResponse<List<object>>.Fail("No ACR records found");

                return ApiResponse<List<object>>.Success(result);
            }
            catch (Exception ex)
            {
                return ApiResponse<List<object>>.Fail($"Error fetching ACR master list: {ex.Message}");
            }
        }

        public async Task<ApiResponse<object>> GetAcrFormData(AcrFormDataRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_acr_form_data}(@p_reference_no::bigint, @p_employee_no::bigint);";
                var jsonStr = await conn.QueryFirstOrDefaultAsync<string>(sql, new
                {
                    p_reference_no = request.ReferenceNo,
                    p_employee_no = request.EmployeeNo
                });

                if (string.IsNullOrWhiteSpace(jsonStr))
                    return ApiResponse<object>.Fail("No form data found");

                using var doc = JsonDocument.Parse(jsonStr);
                var rootObject = JsonSerializer.Deserialize<object>(jsonStr);

                return ApiResponse<object>.Success(rootObject!);
            }
            catch (Exception ex)
            {
                return ApiResponse<object>.Fail($"Error fetching ACR form data: {ex.Message}");
            }
        }

        public async Task<ApiResponse<KpiSaveResponse>> SaveAcrEmployee(AcrEmployeeSaveRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"
                    SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_acr_employee_save}(
                        @p_reference_no::bigint,
                        @p_employee_no::bigint,
                        @p_appraiser_employee_no::bigint,
                        @p_action_type::text,
                        @p_activities_json::text,
                        @p_competencies_json::text,
                        @p_development_needs_json::text,
                        @p_targets_json::text,
                        @p_entryby::numeric,
                        @p_entryip::text
                    );
                ";

                var parameters = new
                {
                    p_reference_no = request.ReferenceNo,
                    p_employee_no = request.EmployeeNo,
                    p_appraiser_employee_no = request.AppraiserEmployeeNo ?? 0,
                    p_action_type = string.IsNullOrWhiteSpace(request.ActionType) ? "DRAFT" : request.ActionType.Trim(),
                    p_activities_json = request.ActivitiesJson,
                    p_competencies_json = request.CompetenciesJson,
                    p_development_needs_json = request.DevelopmentNeedsJson,
                    p_targets_json = request.TargetsJson,
                    p_entryby = request.EntryBy,
                    p_entryip = request.EntryIp?.Trim()
                };

                var result = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, parameters);
                if (result == null)
                    return ApiResponse<KpiSaveResponse>.Fail("No response returned from database");

                if (result.action_status > 0)
                    return ApiResponse<KpiSaveResponse>.Success(result);

                return ApiResponse<KpiSaveResponse>.Fail(result.message ?? "Save failed");
            }
            catch (Exception ex)
            {
                return ApiResponse<KpiSaveResponse>.Fail($"Error saving employee appraisal: {ex.Message}");
            }
        }

        public async Task<ApiResponse<KpiSaveResponse>> SaveAcrSupervisor(AcrSupervisorSaveRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"
                    SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_acr_supervisor_save}(
                        @p_acr_no::bigint,
                        @p_reference_no::bigint,
                        @p_employee_no::bigint,
                        @p_action_type::text,
                        @p_supervisor_performance::text,
                        @p_supervisor_explanation::text,
                        @p_whole_performance::text,
                        @p_final_decision::text,
                        @p_final_remarks::text,
                        @p_activities_json::text,
                        @p_competencies_json::text,
                        @p_development_needs_json::text,
                        @p_targets_json::text,
                        @p_entryby::numeric,
                        @p_entryip::text
                    );
                ";

                var parameters = new
                {
                    p_acr_no = request.AcrNo ?? 0,
                    p_reference_no = request.ReferenceNo,
                    p_employee_no = request.EmployeeNo,
                    p_action_type = string.IsNullOrWhiteSpace(request.ActionType) ? "DRAFT" : request.ActionType.Trim(),
                    p_supervisor_performance = request.SupervisorPerformance?.Trim(),
                    p_supervisor_explanation = request.SupervisorExplanation?.Trim(),
                    p_whole_performance = request.WholePerformance?.Trim(),
                    p_final_decision = request.FinalDecision?.Trim(),
                    p_final_remarks = request.FinalRemarks?.Trim(),
                    p_activities_json = request.ActivitiesJson,
                    p_competencies_json = request.CompetenciesJson,
                    p_development_needs_json = request.DevelopmentNeedsJson,
                    p_targets_json = request.TargetsJson,
                    p_entryby = request.EntryBy,
                    p_entryip = request.EntryIp?.Trim()
                };

                var result = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, parameters);
                if (result == null)
                    return ApiResponse<KpiSaveResponse>.Fail("No response returned from database");

                if (result.action_status > 0)
                    return ApiResponse<KpiSaveResponse>.Success(result);

                return ApiResponse<KpiSaveResponse>.Fail(result.message ?? "Save failed");
            }
            catch (Exception ex)
            {
                return ApiResponse<KpiSaveResponse>.Fail($"Error saving supervisor evaluation: {ex.Message}");
            }
        }

        public async Task<ApiResponse<KpiSaveResponse>> SaveAcrHr(AcrHrSaveRequest request)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $@"
                    SELECT * FROM {DatabasePackage.PG_PACKAGE_NAME}.{DBFunctionName.fn_acr_hr_save}(
                        @p_acr_no::bigint,
                        @p_reference_no::bigint,
                        @p_employee_no::bigint,
                        @p_action_type::text,
                        @p_final_decision::text,
                        @p_final_remarks::text,
                        @p_effective_date::date,
                        @p_promoted_designation_id::bigint,
                        @p_entryby::numeric,
                        @p_entryip::text
                    );
                ";

                var parameters = new
                {
                    p_acr_no = request.AcrNo ?? 0,
                    p_reference_no = request.ReferenceNo,
                    p_employee_no = request.EmployeeNo,
                    p_action_type = string.IsNullOrWhiteSpace(request.ActionType) ? "FINALIZE" : request.ActionType.Trim(),
                    p_final_decision = request.FinalDecision?.Trim(),
                    p_final_remarks = request.FinalRemarks?.Trim(),
                    p_effective_date = request.EffectiveDate?.Date,
                    p_promoted_designation_id = request.PromotedDesignationId,
                    p_entryby = request.EntryBy,
                    p_entryip = request.EntryIp?.Trim()
                };

                var result = await conn.QueryFirstOrDefaultAsync<KpiSaveResponse>(sql, parameters);
                if (result == null)
                    return ApiResponse<KpiSaveResponse>.Fail("No response returned from database");

                if (result.action_status > 0)
                    return ApiResponse<KpiSaveResponse>.Success(result);

                return ApiResponse<KpiSaveResponse>.Fail(result.message ?? "Save failed");
            }
            catch (Exception ex)
            {
                return ApiResponse<KpiSaveResponse>.Fail($"Error processing HR approval: {ex.Message}");
            }
        }
        #endregion
    }
}


//KPI & Annual Performance Appraisal (ACR)

