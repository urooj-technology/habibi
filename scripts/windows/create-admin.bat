@echo off
setlocal
cd /d "%~dp0..\.."

if not exist ".venv\Scripts\python.exe" (
  echo ERROR: Run scripts\windows\setup.bat first.
  pause
  exit /b 1
)

echo Creating Django superuser (admin login for the app)...
".venv\Scripts\python.exe" manage.py createsuperuser
pause
endlocal
