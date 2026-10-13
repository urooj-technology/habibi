@echo off
setlocal
cd /d "%~dp0..\..\frontend"

if not exist "node_modules\" (
  echo Installing frontend packages...
  call npm install
)

if not exist ".env" (
  if exist ".env.example" copy /Y ".env.example" ".env" >nul
)

echo Starting frontend on http://localhost:5173 ...
echo Keep this window open.
call npm run dev
pause
endlocal
