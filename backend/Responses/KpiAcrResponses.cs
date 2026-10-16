using System.Text.Json.Serialization;

namespace Enterprise.HRM.KPI.Responses
{
    public class KpiSaveResponse
    {
        [JsonPropertyName("action_status")]
        public decimal action_status { get; set; }

        [JsonPropertyName("message")]
        public string? message { get; set; }

        [JsonPropertyName("competency_no")]
        public long? competency_no { get; set; }

        [JsonPropertyName("reference_no")]
        public long? reference_no { get; set; }

        [JsonPropertyName("mapping_no")]
        public long? mapping_no { get; set; }

        [JsonPropertyName("acr_no")]
        public long? acr_no { get; set; }
    }
}

