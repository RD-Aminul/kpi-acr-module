using Enterprise.HRM.KPI.Common;
using Enterprise.HRM.KPI.Interfaces;
using Enterprise.HRM.KPI.Requests;
using Enterprise.HRM.KPI.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Enterprise.HRM.KPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class KpiAcrController : ControllerBase
    {
        private readonly IKpiAcrRepositories _kpiAcrRepositories;

        public KpiAcrController(IKpiAcrRepositories kpiAcrRepositories)
        {
            _kpiAcrRepositories = kpiAcrRepositories;
        }

        #region Competency Master
        [HttpGet("GetCompetencyDataList")]
        public async Task<ApiResponse<List<object>>> GetCompetencyDataList([FromQuery] KpiCompetencyRequest request)
        {
            return await _kpiAcrRepositories.GetCompetencyDataList(request);
        }

        [HttpPost("SaveCompetency")]
        public async Task<ApiResponse<KpiSaveResponse>> SaveCompetency([FromBody] KpiCompetencySaveRequest request)
        {
            return await _kpiAcrRepositories.SaveCompetency(request);
        }
        #endregion

        #region KPI Reference
        [HttpGet("GetReferenceDataList")]
        public async Task<ApiResponse<List<object>>> GetReferenceDataList([FromQuery] KpiReferenceRequest request)
        {
            return await _kpiAcrRepositories.GetReferenceDataList(request);
        }

        [HttpGet("GetReferenceList")]
        public async Task<ApiResponse<List<object>>> GetReferenceList()
        {
            return await _kpiAcrRepositories.GetReferenceList();
        }

        [HttpPost("SaveReference")]
        public async Task<ApiResponse<KpiSaveResponse>> SaveReference([FromBody] KpiReferenceSaveRequest request)
        {
            return await _kpiAcrRepositories.SaveReference(request);
        }
        #endregion

        #region Appraiser Mapping
        [HttpGet("GetAppraiserMappingDataList")]
        public async Task<ApiResponse<List<object>>> GetAppraiserMappingDataList([FromQuery] KpiAppraiserMappingRequest request)
        {
            return await _kpiAcrRepositories.GetAppraiserMappingDataList(request);
        }

        [HttpPost("SaveAppraiserMapping")]
        public async Task<ApiResponse<KpiSaveResponse>> SaveAppraiserMapping([FromBody] KpiAppraiserMappingSaveRequest request)
        {
            return await _kpiAcrRepositories.SaveAppraiserMapping(request);
        }
        #endregion

        #region ACR Form & Evaluation
        [HttpGet("GetAcrMasterList")]
        public async Task<ApiResponse<List<object>>> GetAcrMasterList([FromQuery] AcrMasterListRequest request)
        {
            return await _kpiAcrRepositories.GetAcrMasterList(request);
        }

        [HttpGet("GetAcrFormData")]
        public async Task<ApiResponse<object>> GetAcrFormData([FromQuery] AcrFormDataRequest request)
        {
            return await _kpiAcrRepositories.GetAcrFormData(request);
        }

        [HttpPost("SaveAcrEmployee")]
        public async Task<ApiResponse<KpiSaveResponse>> SaveAcrEmployee([FromBody] AcrEmployeeSaveRequest request)
        {
            return await _kpiAcrRepositories.SaveAcrEmployee(request);
        }

        [HttpPost("SaveAcrSupervisor")]
        public async Task<ApiResponse<KpiSaveResponse>> SaveAcrSupervisor([FromBody] AcrSupervisorSaveRequest request)
        {
            return await _kpiAcrRepositories.SaveAcrSupervisor(request);
        }

        [HttpPost("SaveAcrHr")]
        public async Task<ApiResponse<KpiSaveResponse>> SaveAcrHr([FromBody] AcrHrSaveRequest request)
        {
            return await _kpiAcrRepositories.SaveAcrHr(request);
        }
        #endregion
    }
}


//KPI & Annual Performance Appraisal (ACR)

