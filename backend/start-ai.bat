@echo off
echo ========================================
echo  Student AI Assistant Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Checking Python installation... OK
echo.

REM Check if dependencies are installed
echo [2/3] Installing dependencies...
pip install -r ai_requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [3/3] Starting AI Server...
echo.
echo ========================================
echo  AI Assistant will be available at:
echo  - API: http://localhost:8000
echo  - Docs: http://localhost:8000/docs
echo ========================================
echo.

python ai_server.py

pause
