@echo off
setlocal
cd /d "%~dp0"

echo Starting backend and frontend in separate windows...
start "Poshak Habibi - Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "Poshak Habibi - Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Open the Frontend URL in Chrome/Edge after both windows show "ready".
pause
endlocal
