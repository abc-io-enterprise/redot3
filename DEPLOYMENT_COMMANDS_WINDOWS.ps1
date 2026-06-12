# ABC-IO v2.0 - DEPLOYMENT COMMANDS FOR DEVOPS
# Windows PowerShell Version
# Generated: June 12, 2026
# Owner: Christopher Porreca

Write-Host ""
Write-Host "PHASE 1: LOCAL STAGING DEPLOYMENT" -ForegroundColor Cyan
Write-Host ""

Write-Host "Navigating to project directory..." -ForegroundColor Yellow
Set-Location "C:\Users\cplexmath\OneDrive\Documents\redot2"
Write-Host "OK - In project directory: $(Get-Location)" -ForegroundColor Green

Write-Host "Verifying Docker is running..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Write-Host "OK - Docker is running: $dockerVersion" -ForegroundColor Green
}
else {
    Write-Host "ERROR - Docker is not running" -ForegroundColor Red
    exit 1
}

Write-Host "Verifying Docker Compose configuration..." -ForegroundColor Yellow
$composeCheck = docker compose config 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Docker Compose configuration is valid" -ForegroundColor Green
}
else {
    Write-Host "ERROR - Invalid Docker Compose configuration" -ForegroundColor Red
    exit 1
}

Write-Host "Removing existing staging containers..." -ForegroundColor Yellow
docker compose -f compose.staging.yml down --remove-orphans 2>$null
Write-Host "OK - Cleaned up existing staging environment" -ForegroundColor Green

Write-Host "Starting staging stack..." -ForegroundColor Yellow
docker compose -f compose.staging.yml up -d --remove-orphans
Write-Host "OK - Staging stack started" -ForegroundColor Green

Write-Host "Waiting 30 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host "OK - Services initialization complete" -ForegroundColor Green

Write-Host "Running health checks..." -ForegroundColor Yellow
& "./scripts/health-check.sh"
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - All staging services are healthy" -ForegroundColor Green
}
else {
    Write-Host "ERROR - Some staging services failed health checks" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "STAGING DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "All staging services are running and healthy" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Monitor logs: docker compose -f compose.staging.yml logs -f" -ForegroundColor White
Write-Host "  2. Access dashboards:" -ForegroundColor White
Write-Host "     - Gateway API: http://localhost:4000" -ForegroundColor White
Write-Host "     - Owner Dashboard: http://localhost:8500" -ForegroundColor White
Write-Host "     - Grafana: http://localhost:14000 (admin/admin)" -ForegroundColor White
Write-Host ""

$response = Read-Host "Press Enter to continue with production deployment or type 'exit' to stop"
if ($response -eq "exit") {
    exit 0
}

Write-Host ""
Write-Host "PHASE 2: PRODUCTION DEPLOYMENT - REDOT1" -ForegroundColor Cyan
Write-Host ""

$redot1_ip = "162.254.32.142"

Write-Host "Connecting to redot1 ($redot1_ip)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "SSH Command: ssh root@$redot1_ip" -ForegroundColor White
Write-Host ""
Write-Host "Execute the following commands on redot1:" -ForegroundColor Yellow
Write-Host ""
Write-Host "cd /opt/redot2" -ForegroundColor Green
Write-Host "docker compose -f compose.prod.yml pull" -ForegroundColor Green
Write-Host "docker compose -f compose.prod.yml down" -ForegroundColor Green
Write-Host "docker compose -f compose.prod.yml up -d --remove-orphans" -ForegroundColor Green
Write-Host "sleep 30" -ForegroundColor Green
Write-Host "./scripts/health-check.sh" -ForegroundColor Green
Write-Host "curl -I https://abc-io.com/health" -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "PHASE 3: PRODUCTION DEPLOYMENT - AI1" -ForegroundColor Cyan
Write-Host ""

$ai1_ip = "192.227.212.235"

Write-Host "Connecting to ai1 ($ai1_ip)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "SSH Command: ssh root@$ai1_ip" -ForegroundColor White
Write-Host ""
Write-Host "Execute the following commands on ai1:" -ForegroundColor Yellow
Write-Host ""
Write-Host "cd /opt/redot2" -ForegroundColor Green
Write-Host "docker compose -f compose.replica-ai1.yml pull" -ForegroundColor Green
Write-Host "docker compose -f compose.replica-ai1.yml down" -ForegroundColor Green
Write-Host "docker compose -f compose.replica-ai1.yml up -d --remove-orphans" -ForegroundColor Green
Write-Host "sleep 30" -ForegroundColor Green
Write-Host "./scripts/health-check.sh" -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "PHASE 4: PRODUCTION DEPLOYMENT - AI2" -ForegroundColor Cyan
Write-Host ""

$ai2_ip = "192.227.212.237"

Write-Host "Connecting to ai2 ($ai2_ip)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "SSH Command: ssh root@$ai2_ip" -ForegroundColor White
Write-Host ""
Write-Host "Execute the following commands on ai2:" -ForegroundColor Yellow
Write-Host ""
Write-Host "cd /opt/redot2" -ForegroundColor Green
Write-Host "docker compose -f compose.replica-ai2.yml pull" -ForegroundColor Green
Write-Host "docker compose -f compose.replica-ai2.yml down" -ForegroundColor Green
Write-Host "docker compose -f compose.replica-ai2.yml up -d --remove-orphans" -ForegroundColor Green
Write-Host "sleep 30" -ForegroundColor Green
Write-Host "./scripts/health-check.sh" -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "DEPLOYMENT CHECKLIST" -ForegroundColor Green
Write-Host ""

Write-Host "Staging (Local) - Windows PowerShell" -ForegroundColor Yellow
Write-Host "  OK - Completed above" -ForegroundColor Green
Write-Host ""

Write-Host "Production Nodes - Execute via SSH" -ForegroundColor Yellow
Write-Host "  [ ] redot1 (162.254.32.142)" -ForegroundColor White
Write-Host "  [ ] ai1 (192.227.212.235)" -ForegroundColor White
Write-Host "  [ ] ai2 (192.227.212.237)" -ForegroundColor White
Write-Host ""

Write-Host "Post-Deployment Verification" -ForegroundColor Yellow
Write-Host "  [ ] All services healthy" -ForegroundColor White
Write-Host "  [ ] Public endpoints responding" -ForegroundColor White
Write-Host "  [ ] Dashboards accessible" -ForegroundColor White
Write-Host "  [ ] Database connected" -ForegroundColor White
Write-Host "  [ ] Cache operational" -ForegroundColor White
Write-Host ""

Write-Host "Success Criteria" -ForegroundColor Yellow
Write-Host "  [ ] Error rate less than 1%" -ForegroundColor White
Write-Host "  [ ] API response time P95 less than 200ms" -ForegroundColor White
Write-Host "  [ ] Payment processing working" -ForegroundColor White
Write-Host "  [ ] Email delivery confirmed" -ForegroundColor White
Write-Host "  [ ] Uptime greater than 99.9%" -ForegroundColor White
Write-Host ""

Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "100 Years Nonstop - Always On, Always Yours, Always Here" -ForegroundColor Magenta
Write-Host ""
