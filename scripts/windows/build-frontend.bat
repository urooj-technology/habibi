@echo off
setlocal
cd /d "%~dp0..\..\frontend"

REM Builds React into ..\static\frontend so Django serves it at http://127.0.0.1:8000/
where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js / npm not found.
  echo Install Node.js LTS from https://nodejs.org/ then run this again.
  if not "%~1"=="nopause" pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing frontend packages...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    if not "%~1"=="nopause" pause
    exit /b 1
  )
)

echo Building React app into static\frontend ...
call npm run build
if errorlevel 1 (
  echo ERROR: build failed.
  if not "%~1"=="nopause" pause
  exit /b 1
)

echo.
echo Build complete. Restart the backend if it is running, then open http://127.0.0.1:8000
if not "%~1"=="nopause" pause
endlocal
