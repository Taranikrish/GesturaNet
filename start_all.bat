@echo off
SETLOCAL EnableDelayedExpansion
SET ROOT_DIR=%~dp0

echo.
echo ==========================================
echo  Starting GesturaNet Multi-Tier Stack
echo ==========================================

:: Run environment setup first
call env_setup.bat
if %errorlevel% neq 0 (
    echo [ERROR] Environment setup failed. Aborting.
    pause
    exit /b 1
)

:: We use PowerShell to launch processes so we can capture their exact PIDs.
:: This ensures that even if Node/Python change the window title, we can still kill them.
set PS_SCRIPT="%TEMP%\gesturanet_launcher.ps1"

echo $ErrorActionPreference = 'SilentlyContinue' > %PS_SCRIPT%
echo $rootDir = '%ROOT_DIR%' >> %PS_SCRIPT%
echo Write-Host '[1/3] Starting Node.js Backend...' >> %PS_SCRIPT%
echo $backend = Start-Process cmd -ArgumentList '/c title GN_Backend ^& npm run dev' -WorkingDirectory "$rootDir\backend" -PassThru >> %PS_SCRIPT%
echo Start-Sleep -Seconds 2 >> %PS_SCRIPT%
echo Write-Host '[2/3] Starting React Frontend...' >> %PS_SCRIPT%
echo $frontend = Start-Process cmd -ArgumentList '/c title GN_Frontend ^& npm run dev' -WorkingDirectory "$rootDir\frontend\gesturaNet-frontend" -PassThru >> %PS_SCRIPT%
echo Start-Sleep -Seconds 2 >> %PS_SCRIPT%
echo Write-Host '[3/3] Initializing Python Engine...' >> %PS_SCRIPT%
echo $engine = Start-Process cmd -ArgumentList '/c title GN_Engine ^& call ..\env\Scripts\activate.bat ^& python main.py' -WorkingDirectory "$rootDir\Engine" -PassThru >> %PS_SCRIPT%
echo $pids = "$($backend.Id),$($frontend.Id),$($engine.Id)" >> %PS_SCRIPT%
echo Write-Output $pids >> %PS_SCRIPT%

:: Run the script and capture the PIDs
for /f "delims=" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File %PS_SCRIPT%') do (
    set PIDS_LIST=%%a
)

del %PS_SCRIPT% > nul 2>&1

:: Create a lock file
set "LOCKFILE=%ROOT_DIR%.gn_running.lock"
echo locked > "%LOCKFILE%"

:: Launch the detached watchdog. It will poll the lock file. 
:: Once the lock is released (e.g. main window closes), it will kill the exact PIDs.
start "" /B powershell -NoProfile -WindowStyle Hidden -Command "$lockPath='%LOCKFILE%'; $pids = '%PIDS_LIST%' -split ','; Start-Sleep -Seconds 3; while ($true) { Start-Sleep -Seconds 1; try { $stream = [System.IO.File]::Open($lockPath, 'Open', 'ReadWrite', 'None'); $stream.Close(); break } catch { continue } }; Remove-Item $lockPath -Force -ErrorAction SilentlyContinue; foreach ($p in $pids) { taskkill /F /T /PID $p 2>$null }"

:: Read .env file for display
set BACKEND_HOST=localhost
set BACKEND_PORT=5000
set FRONTEND_HOST=localhost
set FRONTEND_PORT=5173
if exist "%ROOT_DIR%.env" (
    for /f "usebackq eol=# tokens=1,2 delims==" %%A in ("%ROOT_DIR%.env") do (
        if "%%A"=="BACKEND_HOST" set BACKEND_HOST=%%B
        if "%%A"=="BACKEND_PORT" set BACKEND_PORT=%%B
        if "%%A"=="FRONTEND_HOST" set FRONTEND_HOST=%%B
        if "%%A"=="FRONTEND_PORT" set FRONTEND_PORT=%%B
    )
)

echo.
echo ==========================================
echo  Services are running:
echo  - Backend:  http://!BACKEND_HOST!:!BACKEND_PORT!
echo  - Frontend: http://!FRONTEND_HOST!:!FRONTEND_PORT!
echo.
echo  Press any key or close this window
echo  to stop ALL services.
echo ==========================================

:: Hold the lock file open, keeping the watchdog in "wait" mode.
:: When this command terminates (any way: keypress, Ctrl+C, window close),
:: the file handle is released and the watchdog triggers cleanup.
(
    pause
) >> "%LOCKFILE%" 2>&1

:: ── Normal exit path ─────────────────────────────────────────────────────────
echo.
echo [!] Terminating all GesturaNet processes...
for %%p in (%PIDS_LIST:,= %) do (
    taskkill /F /T /PID %%p > nul 2>&1
)
del "%LOCKFILE%" > nul 2>&1
echo [OK] All services stopped.
timeout /t 1 /nobreak > nul
exit
