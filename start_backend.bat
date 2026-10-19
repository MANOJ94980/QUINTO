@echo off
title QGridShield - Laptop 1 Hub & Sender Backend
echo ========================================================
echo  Starting QGridShield Hub & Quantum Simulation Engine...
echo ========================================================
cd /d "%~dp0"
set PYTHONPATH=%cd%
if not defined QGRID_PORT set "QGRID_PORT=8000"
where py >nul 2>nul
if errorlevel 1 (
	echo Python Launcher not found. Install Python 3.11 and enable the py launcher.
	pause
	exit /b 1
)
py -3.11 -m uvicorn backend.hub:app --host 0.0.0.0 --port %QGRID_PORT% --reload
pause
