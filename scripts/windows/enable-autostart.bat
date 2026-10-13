@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM Creates a Startup-folder shortcut so the app starts when Windows logs in.
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%~dp0start-all-hidden.vbs"
set "LINK=%STARTUP%\PoshakHabibi.lnk"

if not exist "%~dp0..\..\.venv\Scripts\python.exe" (
  echo ERROR: Run setup.bat first, then enable auto-start.
  pause
  exit /b 1
)

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%LINK%'); ^
   $s.TargetPath = '%TARGET%'; ^
   $s.WorkingDirectory = '%~dp0'; ^
   $s.WindowStyle = 7; ^
   $s.Description = 'Start Poshak Habibi API + UI'; ^
   $s.Save()"

if errorlevel 1 (
  echo ERROR: Could not create Startup shortcut.
  pause
  exit /b 1
)

echo.
echo Auto-start ENABLED.
echo After you log into Windows, the app will start automatically.
echo Frontend: http://localhost:5173
echo.
echo To turn this off later, run: disable-autostart.bat
echo.
pause
endlocal
