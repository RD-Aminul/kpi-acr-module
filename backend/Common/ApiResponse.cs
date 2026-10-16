namespace Enterprise.HRM.KPI.Common;

public class ApiResponse<T>
{
    public T? Data { get; set; }
    public bool Status { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }

    public static ApiResponse<T> Success(T data, string msg = "Success")
        => new ApiResponse<T> { Data = data, Status = true, Message = msg };

    public static ApiResponse<T> Fail(string msg = "Failed", string? errorCode = null)
        => new ApiResponse<T> { Data = default, Status = false, Message = msg, ErrorCode = errorCode };
}
