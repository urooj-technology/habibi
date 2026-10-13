@echo off
setlocal
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PoshakHabibi.lnk"

if exist "%LINK%" (
  del "%LINK%"
  echo Auto-start DISABLED. Shortcut removed.
) else (
  echo Auto-start was not enabled ^(no shortcut found^).
)
echo.
pause
endlocal
