@echo off
TITLE GesturaNet Multi-Tier Starter
SET ROOT_DIR=%~dp0

:: 1. Start Backend
echo [1/3] Starting Node.js Backend...
cd /d "%ROOT_DIR%backend"
start "GesturaNet Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

:: 2. Start Frontend
echo [2/3] Starting React Frontend...
cd /d "%ROOT_DIR%frontend\gesturaNet-frontend"
start "GesturaNet Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

:: 3. Start Python Engine
echo [3/3] Initializing Python Engine (3 Workers)...
cd /d "%ROOT_DIR%Engine"

:: Environment setup, dependency check, and execution
:: We activate the env, check requirements, and then launch main.py
start "GesturaNet Engine" cmd /k "call ..\env\Scripts\activate.bat && echo Checking Pip Requirements... && pip install -r ..\requirements.txt && echo Starting Engine... && python main.py"

echo.
echo ==========================================
echo  GesturaNet Services are starting up...
echo  - Backend: http://localhost:5000
echo  - Frontend: http://localhost:5173
echo ==========================================
pause
