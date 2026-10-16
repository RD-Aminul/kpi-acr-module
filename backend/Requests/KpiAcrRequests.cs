namespace Enterprise.HRM.KPI.Requests
{
    // --- Competency Master ---
    public class KpiCompetencyRequest
    {
        public string? Search { get; set; }
    }

    public class KpiCompetencySaveRequest
    {
        public long? CompetencyNo { get; set; }
        public string? CompetencyName { get; set; }
        public string? Description { get; set; }
        public decimal? ActiveStat { get; set; } = 1;
        public decimal? EntryBy { get; set; }
        public string? EntryIp { get; set; }
    }

    // --- KPI Reference ---
    public class KpiReferenceRequest
    {
        public string? Search { get; set; }
        public decimal? ActiveStat { get; set; } = -1;
    }

    public class KpiReferenceSaveRequest
    {
        public long? ReferenceNo { get; set; }
        public string? ReferenceCode { get; set; }
        public string? EvaluationFrom { get; set; }
        public string? EvaluationTo { get; set; }
        public string? EmployeeDueDate { get; set; }
        public string? SupervisorDueDate { get; set; }
        public string? Description { get; set; }
        public decimal? ActiveStat { get; set; } = 1;
        public string? CycleStatus { get; set; } = "DRAFT";
        public decimal? EntryBy { get; set; }
        public string? EntryIp { get; set; }
    }

    // --- Appraiser Mapping ---
    public class KpiAppraiserMappingRequest
    {
        public long ReferenceNo { get; set; }
        public long? EmployeeNo { get; set; } = -1;
    }

    public class KpiAppraiserMappingSaveRequest
    {
        public long? MappingNo { get; set; }
        public long ReferenceNo { get; set; }
        public long? EmployeeNo { get; set; }
        public List<long>? EmployeeNos { get; set; }
        public long AppraiserEmployeeNo { get; set; }
        public decimal? ActiveStat { get; set; } = 1;
        public decimal? EntryBy { get; set; }
        public string? EntryIp { get; set; }
    }

    // --- ACR Form & Evaluation ---
    public class AcrMasterListRequest
    {
        public long? ReferenceNo { get; set; } = -1;
        public long? EmployeeNo { get; set; } = -1;
        public string? Role { get; set; } = "ALL"; // 'EMPLOYEE', 'SUPERVISOR', 'ALL'
        public string? Status { get; set; }
    }

    public class AcrFormDataRequest
    {
        public long ReferenceNo { get; set; }
        public long EmployeeNo { get; set; }
    }

    public class AcrEmployeeSaveRequest
    {
        public long ReferenceNo { get; set; }
        public long EmployeeNo { get; set; }
        public long? AppraiserEmployeeNo { get; set; }
        public string ActionType { get; set; } = "DRAFT"; // 'DRAFT' or 'SUBMIT'
        public string? ActivitiesJson { get; set; }
        public string? CompetenciesJson { get; set; }
        public string? DevelopmentNeedsJson { get; set; }
        public string? TargetsJson { get; set; }
        public decimal? EntryBy { get; set; }
        public string? EntryIp { get; set; }
    }

    public class AcrSupervisorSaveRequest
    {
        public long? AcrNo { get; set; }
        public long ReferenceNo { get; set; }
        public long EmployeeNo { get; set; }
        public string ActionType { get; set; } = "DRAFT"; // 'DRAFT', 'SUBMIT', 'RETURN'
        public string? SupervisorPerformance { get; set; }
        public string? SupervisorExplanation { get; set; }
        public string? WholePerformance { get; set; }
        public string? FinalDecision { get; set; }
        public string? FinalRemarks { get; set; }
        public string? ActivitiesJson { get; set; }
        public string? CompetenciesJson { get; set; }
        public string? DevelopmentNeedsJson { get; set; }
        public string? TargetsJson { get; set; }
        public decimal? EntryBy { get; set; }
        public string? EntryIp { get; set; }
    }

    public class AcrHrSaveRequest
    {
        public long? AcrNo { get; set; }
        public long ReferenceNo { get; set; }
        public long EmployeeNo { get; set; }
        public string ActionType { get; set; } = "FINALIZE"; // 'FINALIZE' or 'RETURN_TO_SUPERVISOR'
        public string? FinalDecision { get; set; }
        public string? FinalRemarks { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public long? PromotedDesignationId { get; set; }
        public decimal? EntryBy { get; set; }
        public string? EntryIp { get; set; }
    }
}

