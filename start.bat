@echo off
echo Starting Trading Platform...
echo.

echo [1/3] Starting MongoDB and Redis...
docker-compose up -d mongo redis
timeout /t 3 /nobreak > nul

echo.
echo [2/3] Starting Backend (NestJS)...
start cmd /k "cd backend && npm run start:dev"
timeout /t 2 /nobreak > nul

echo.
echo [3/3] Starting Frontend (Next.js)...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Trading Platform is starting!
echo ========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo   Press any key to exit this window...
pause > nul
