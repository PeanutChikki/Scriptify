@echo off
REM ==============================================================================
REM Scriptify Startup Script for Windows
REM ==============================================================================
cd /d "%~dp0"

echo ==================================================
echo  Starting Scriptify (AI-Powered Document Generator)
echo ==================================================

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] python command not found. Please install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

REM Check Ollama
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] 'ollama' CLI not found on PATH.
    echo Please install Ollama from https://ollama.ai and start the service.
) else (
    echo [OK] Ollama CLI detected.
)

REM Check virtual environment
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Creating Python virtual environment in .venv...
    python -m venv .venv
    echo [INFO] Installing dependencies from requirements.txt...
    .venv\Scripts\pip install -r requirements.txt
) else (
    .venv\Scripts\pip install -r requirements.txt --quiet
)

REM Check frontend build
if not exist "Frontend\dist" (
    echo [INFO] Frontend build not found. Building frontend...
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        cd Frontend
        call npm install
        call npm run build
        cd ..
    ) else (
        echo [WARNING] npm not found; skipping frontend build.
    )
)

echo ==================================================
echo  Starting Scriptify server at http://127.0.0.1:8000
echo  Press Ctrl+C to stop the server.
echo ==================================================

.venv\Scripts\python backend\server.py
pause

