@echo off
title SpotBersih - AI Waste Management Launcher
color 0A

echo ========================================================
echo        RESIK / SPOTBERSIH - AI WASTE MANAGEMENT
echo        Deteksi & Pemetaan Sampah Berbasis AI
echo ========================================================
echo.
echo [1/2] Menjalankan Server Backend AI (FastAPI & YOLO)...
start "SpotBersih AI Engine (Port 8000)" cmd /k "python yolo_api_server.py"

timeout /t 2 >nul

echo [2/2] Menjalankan Aplikasi Web SpotBersih (Port 3000)...
start "SpotBersih Web App (Port 3000)" cmd /k "python -m http.server 3000 --directory app/dist"

timeout /t 2 >nul

echo.
echo ========================================================
echo  Semua Server Berhasil Dijalankan!
echo  Membuka SpotBersih di Browser: http://localhost:3000
echo ========================================================
start http://localhost:3000

pause
