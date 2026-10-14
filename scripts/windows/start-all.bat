@echo off
setlocal
cd /d "%~dp0..\.."

if not exist "static\frontend\index.html" (
  echo React build not found - building it first...
  call "%~dp0build-frontend.bat" nopause
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

REM Django serves both the API and the React app on one port.
start "Poshak Habibi" cmd /k "%~dp0start-backend.bat"

echo.
echo App: http://127.0.0.1:8000
echo Keep the "Poshak Habibi" window open while using the app.
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8000"
endlocal
