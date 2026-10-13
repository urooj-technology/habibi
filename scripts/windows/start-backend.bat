@echo off
setlocal
cd /d "%~dp0..\.."

if not exist ".venv\Scripts\python.exe" (
  echo ERROR: Run scripts\windows\setup.bat first.
  pause
  exit /b 1
)

if not exist ".env" (
  echo ERROR: Missing .env - run setup.bat or copy .env.example to .env
  pause
  exit /b 1
)

echo Starting Django API on http://127.0.0.1:8000 ...
echo Keep this window open.
".venv\Scripts\python.exe" manage.py runserver 127.0.0.1:8000
pause
endlocal
