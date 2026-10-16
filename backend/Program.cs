using Enterprise.HRM.KPI.Interfaces;
using Enterprise.HRM.KPI.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Database Connection & DI
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=enterprise_hrm;Username=postgres;Password=postgres";

builder.Services.AddScoped<IKpiAcrRepositories>(sp => new KpiAcrRepositories(connectionString));

// Enable CORS for frontend development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure HTTP request pipeline.
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Enterprise KPI & Performance Appraisal API v1");
        c.RoutePrefix = string.Empty; // Serve Swagger at root URL
    });
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
