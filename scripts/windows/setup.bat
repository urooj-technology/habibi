@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo ========================================
echo  Poshak Habibi - Windows first-time setup
echo ========================================
echo.

REM --- Python version check (need 3.12 or 3.13; NOT 3.15) ---
where py >nul 2>&1
if errorlevel 1 (
  where python >nul 2>&1
  if errorlevel 1 (
    echo ERROR: Python is not installed or not on PATH.
    echo Install Python 3.12 or 3.13 from https://www.python.org/downloads/
    echo IMPORTANT: Do NOT use Python 3.15 with this project.
    pause
    exit /b 1
  )
  set "PY=python"
) else (
  set "PY=py"
)

echo Using Python launcher: %PY%
%PY% -3.13 -c "import sys; print(sys.version)" 2>nul
if not errorlevel 1 (
  set "PYCMD=%PY% -3.13"
  goto :py_ok
)
%PY% -3.12 -c "import sys; print(sys.version)" 2>nul
if not errorlevel 1 (
  set "PYCMD=%PY% -3.12"
  goto :py_ok
)
%PY% -c "import sys; v=sys.version_info; print(sys.version); raise SystemExit(0 if v[:2] in ((3,12),(3,13)) else 1)" 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: This project needs Python 3.12 or 3.13.
  echo Your machine may have Python 3.15, which is NOT supported by Django 5.1.
  echo.
  echo Download Python 3.13: https://www.python.org/downloads/release/python-3139/
  echo During install, check "Add python.exe to PATH".
  echo Then run this setup again.
  pause
  exit /b 1
)
set "PYCMD=%PY%"

:py_ok
echo.
echo [1/6] Creating virtual environment (.venv)...
if not exist ".venv\Scripts\python.exe" (
  %PYCMD% -m venv .venv
  if errorlevel 1 (
    echo ERROR: Failed to create virtual environment.
    pause
    exit /b 1
  )
) else (
  echo Virtual environment already exists.
)

echo.
echo [2/6] Upgrading pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
  echo ERROR: pip upgrade failed.
  pause
  exit /b 1
)

echo.
echo [3/6] Installing Python packages...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: pip install failed. Use Python 3.12/3.13 and try again.
  pause
  exit /b 1
)

echo.
echo [4/6] Preparing .env files...
if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo Created .env from .env.example
) else (
  echo .env already exists - left unchanged.
)
if not exist "frontend\.env" (
  copy /Y "frontend\.env.example" "frontend\.env" >nul
  echo Created frontend\.env from frontend\.env.example
) else (
  echo frontend\.env already exists - left unchanged.
)

echo.
echo [5/6] Running database migrations...
".venv\Scripts\python.exe" manage.py migrate
if errorlevel 1 (
  echo ERROR: migrate failed.
  pause
  exit /b 1
)

echo.
echo [6/6] Installing frontend dependencies...
where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js / npm not found.
  echo Install Node.js LTS from https://nodejs.org/ then run setup again
  echo ^(or only run: cd frontend ^&^& npm install^)
  pause
  exit /b 1
)
pushd frontend
call npm install
if errorlevel 1 (
  popd
  echo ERROR: npm install failed.
  pause
  exit /b 1
)
popd

echo.
echo ========================================
echo  Setup complete.
echo.
echo  Next steps:
echo   1. Optional: create admin user
echo        scripts\windows\create-admin.bat
echo   2. Start the app
echo        scripts\windows\start-all.bat
echo ========================================
pause
endlocal
