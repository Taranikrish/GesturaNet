@echo off
SETLOCAL EnableDelayedExpansion
SET ROOT_DIR=%~dp0

echo.
echo ==========================================
echo  GesturaNet Environment Setup
echo ==========================================

:: 1. Python Environment Setup
echo [1/3] Checking Python Virtual Environment...
if not exist "%ROOT_DIR%env" (
    echo [!] Virtual environment 'env' not found. Creating...
    python -m venv "%ROOT_DIR%env"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment exists.
)

echo [2/3] Installing/Updating Python Requirements...
call "%ROOT_DIR%env\Scripts\activate.bat"
pip install -r "%ROOT_DIR%requirements.txt"
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install Python requirements.
    exit /b 1
)
echo [OK] Python dependencies satisfied.

:: 2. Node.js Environment Setup
echo [3/3] Checking Node.js Dependencies...

:: Backend
if not exist "%ROOT_DIR%backend\node_modules" (
    echo [!] Backend node_modules not found. Installing...
    pushd "%ROOT_DIR%backend"
    npm install
    popd
) else (
    echo [OK] Backend dependencies exist.
)

:: Frontend
if not exist "%ROOT_DIR%frontend\gesturaNet-frontend\node_modules" (
    echo [!] Frontend node_modules not found. Installing...
    pushd "%ROOT_DIR%frontend\gesturaNet-frontend"
    npm install
    popd
) else (
    echo [OK] Frontend dependencies exist.
)

echo.
echo [SUCCESS] Environment setup complete.
echo ==========================================
echo.

exit /b 0
