@echo off
echo Stopping Trading Platform...
echo.

echo [1/2] Stopping Docker containers...
docker-compose down

echo.
echo [2/2] Containers stopped.
echo.
echo Press any key to exit...
pause > nul
