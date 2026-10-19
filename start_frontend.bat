@echo off
title QGridShield - Frontend (Laptop 1/2/3 UI)
echo ========================================================
echo  Starting QGridShield Frontend Dev Server (Port 3000)...
echo ========================================================
cd /d "%~dp0frontend"
if not defined QGRID_PORT set "QGRID_PORT=8000"
if not defined VITE_BACKEND_URL set "VITE_BACKEND_URL=http://localhost:%QGRID_PORT%"
npm.cmd run dev -- --host 0.0.0.0 --port 3000
pause
