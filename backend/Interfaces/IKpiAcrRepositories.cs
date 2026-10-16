using Enterprise.HRM.KPI.Common;
using Enterprise.HRM.KPI.Requests;
using Enterprise.HRM.KPI.Responses;

namespace Enterprise.HRM.KPI.Interfaces
{
    public interface IKpiAcrRepositories
    {
        // Competency Master
        Task<ApiResponse<List<object>>> GetCompetencyDataList(KpiCompetencyRequest request);
        Task<ApiResponse<KpiSaveResponse>> SaveCompetency(KpiCompetencySaveRequest request);

        // KPI Reference / Cycle
        Task<ApiResponse<List<object>>> GetReferenceDataList(KpiReferenceRequest request);
        Task<ApiResponse<List<object>>> GetReferenceList();
        Task<ApiResponse<KpiSaveResponse>> SaveReference(KpiReferenceSaveRequest request);

        // Appraiser Mapping
        Task<ApiResponse<List<object>>> GetAppraiserMappingDataList(KpiAppraiserMappingRequest request);
        Task<ApiResponse<KpiSaveResponse>> SaveAppraiserMapping(KpiAppraiserMappingSaveRequest request);

        // ACR Form & Evaluation
        Task<ApiResponse<List<object>>> GetAcrMasterList(AcrMasterListRequest request);
        Task<ApiResponse<object>> GetAcrFormData(AcrFormDataRequest request);
        Task<ApiResponse<KpiSaveResponse>> SaveAcrEmployee(AcrEmployeeSaveRequest request);
        Task<ApiResponse<KpiSaveResponse>> SaveAcrSupervisor(AcrSupervisorSaveRequest request);
        Task<ApiResponse<KpiSaveResponse>> SaveAcrHr(AcrHrSaveRequest request);
    }
}

