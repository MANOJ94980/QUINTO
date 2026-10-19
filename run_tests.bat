@echo off
title QGridShield - Test Suite
echo ========================================================
echo  Running QGridShield Backend & Quantum Protocol Tests...
echo ========================================================
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
	echo Python Launcher not found. Install Python 3.11 and enable the py launcher.
	pause
	exit /b 1
)
py -3.11 -m pytest tests/test_backend.py -v
pause
