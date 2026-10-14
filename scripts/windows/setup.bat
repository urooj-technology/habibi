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
echo [1/6] Virtual environment...
set "VENV=.venv"
if not exist "%VENV%\Scripts\python.exe" if exist "venv\Scripts\python.exe" set "VENV=venv"
if not exist "%VENV%\Scripts\python.exe" (
  echo Creating %VENV% ...
  %PYCMD% -m venv %VENV%
  if errorlevel 1 (
    echo ERROR: Failed to create virtual environment.
    pause
    exit /b 1
  )
) else (
  echo Using existing %VENV%
)

echo.
echo [2/6] Upgrading pip...
"%VENV%\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
  echo ERROR: pip upgrade failed.
  pause
  exit /b 1
)

echo.
echo [3/6] Installing Python packages...
"%VENV%\Scripts\python.exe" -m pip install -r requirements.txt
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
"%VENV%\Scripts\python.exe" manage.py migrate
if errorlevel 1 (
  echo ERROR: migrate failed.
  pause
  exit /b 1
)

echo.
echo [6/6] Frontend build (static\frontend)...
if exist "static\frontend\index.html" (
  echo React build already present - Node.js is not needed on this PC.
  echo To rebuild after code changes run: scripts\windows\build-frontend.bat
) else (
  call "%~dp0build-frontend.bat" nopause
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo  Setup complete.
echo.
echo  Next steps:
echo   1. Optional: create admin user
echo        scripts\windows\create-admin.bat
echo   2. Start the app
echo        scripts\windows\start-all.bat
echo   3. Open http://127.0.0.1:8000
echo ========================================
pause
endlocal
