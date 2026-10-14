@echo off
setlocal
cd /d "%~dp0..\.."

set "VENV=.venv"
if not exist ".venv\Scripts\python.exe" if exist "venv\Scripts\python.exe" set "VENV=venv"
if not exist "%VENV%\Scripts\python.exe" (
  echo ERROR: Run scripts\windows\setup.bat first.
  pause
  exit /b 1
)

echo Creating Django superuser (admin login for the app)...
"%VENV%\Scripts\python.exe" manage.py createsuperuser
pause
endlocal
