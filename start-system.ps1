# Trading Platform Startup Script
# This script starts all services properly

Write-Host "=== Trading Platform Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker services
Write-Host "1. Checking Docker services..." -ForegroundColor Yellow
$mongo = docker ps --filter "name=mongo" --format "{{.Names}}" 2>$null
$redis = docker ps --filter "name=redis" --format "{{.Names}}" 2>$null

if ($mongo -match "mongo") {
    Write-Host "   ✓ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Starting MongoDB..." -ForegroundColor Yellow
    docker-compose up -d mongo
    Start-Sleep -Seconds 2
}

if ($redis -match "redis") {
    Write-Host "   ✓ Redis is running" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Starting Redis..." -ForegroundColor Yellow
    docker-compose up -d redis
    Start-Sleep -Seconds 2
}

# Check if ports are in use
Write-Host "`n2. Checking ports..." -ForegroundColor Yellow
$port3001 = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
$port3000 = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($port3001) {
    Write-Host "   ⚠ Port 3001 is already in use (backend may already be running)" -ForegroundColor Yellow
} else {
    Write-Host "   ✓ Port 3001 is available" -ForegroundColor Green
}

if ($port3000) {
    Write-Host "   ⚠ Port 3000 is already in use (frontend may already be running)" -ForegroundColor Yellow
} else {
    Write-Host "   ✓ Port 3000 is available" -ForegroundColor Green
}

# Check dependencies
Write-Host "`n3. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules") {
    Write-Host "   ✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Installing backend dependencies..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
}

if (Test-Path "frontend\node_modules") {
    Write-Host "   ✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

# Start backend
Write-Host "`n4. Starting backend server..." -ForegroundColor Yellow
if (-not $port3001) {
    $backendPath = (Resolve-Path "backend").Path
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server Starting...' -ForegroundColor Cyan; npm run start:dev" -WindowStyle Normal
    Write-Host "   ✓ Backend window opened" -ForegroundColor Green
    Write-Host "   ⏳ Wait 10-15 seconds for backend to start" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠ Backend may already be running" -ForegroundColor Yellow
}

# Start frontend
Write-Host "`n5. Starting frontend server..." -ForegroundColor Yellow
if (-not $port3000) {
    Start-Sleep -Seconds 5
    $frontendPath = (Resolve-Path "frontend").Path
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Server Starting...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
    Write-Host "   ✓ Frontend window opened" -ForegroundColor Green
    Write-Host "   ⏳ Wait 10-15 seconds for frontend to start" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠ Frontend may already be running" -ForegroundColor Yellow
}

# Final instructions
Write-Host "`n=== Startup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Two PowerShell windows have opened:" -ForegroundColor White
Write-Host "  - Backend window: Check for 'Nest application successfully started'" -ForegroundColor White
Write-Host "  - Frontend window: Check for 'ready' or 'compiled successfully'" -ForegroundColor White
Write-Host ""
Write-Host "Wait 15-20 seconds, then:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "  2. Login as admin: admin@trading.com / admin123" -ForegroundColor White
Write-Host ""
Write-Host "If you see errors in the windows:" -ForegroundColor Yellow
Write-Host "  - Check TROUBLESHOOTING.md for solutions" -ForegroundColor White
Write-Host "  - Ensure MongoDB and Redis are running" -ForegroundColor White
Write-Host "  - Check for port conflicts" -ForegroundColor White
Write-Host ""
