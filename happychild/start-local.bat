@echo off
setlocal
cd /d "%~dp0.."
set "PY_EXE=C:\Users\kurob\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if not exist "%PY_EXE%" (
  for /f "delims=" %%P in ('where py.exe 2^>nul') do if not defined PY_FOUND set "PY_FOUND=%%P"
  if defined PY_FOUND set "PY_EXE=%PY_FOUND%"
)

if not exist "%PY_EXE%" (
  echo Khong tim thay Python de chay HappyChild.
  echo Hay cai Python, sau do thu lai.
  pause
  exit /b 1
)

start "HappyChild Local Server" /min "%PY_EXE%" -m http.server 8080 --bind 127.0.0.1

for /l %%I in (1,1,10) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:8080/happychild/'; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"
  if not errorlevel 1 goto ready
  timeout /t 1 /nobreak >nul
)

echo Khong the khoi dong HappyChild tai cong 8080.
echo Hay chup man hinh cua so nay va gui lai de kiem tra.
pause
exit /b 1

:ready
start "" "http://127.0.0.1:8080/happychild/"
endlocal
