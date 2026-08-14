@echo off
title SpotBersih - AI Waste Management Launcher
color 0A

echo ========================================================
echo        SPOTBERSIH - AI WASTE MANAGEMENT
echo        Pantau Sampah, Bersihkan Bersama
echo ========================================================
echo.
echo [1/3] Menjalankan Server Backend AI (FastAPI & YOLO Port 8000)...
start "SpotBersih AI Engine (Port 8000)" cmd /k "python yolo_api_server.py"

timeout /t 2 >nul

echo [2/3] Menjalankan Cloudflare Tunnel untuk Akses Smartphone...
start "SpotBersih Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://127.0.0.1:8000"

timeout /t 2 >nul

echo [3/3] Menjalankan Aplikasi Web SpotBersih (Port 3000)...
start "SpotBersih Web App (Port 3000)" cmd /k "python -m http.server 3000 --directory app/dist"

timeout /t 2 >nul

echo.
echo ========================================================
echo  Semua Server Berhasil Aktif!
echo  Laptop Browser : http://localhost:3000
echo  Akses dari HP  : Buka https://franswaas.github.io/spotbersih/
echo                   atau di WiFi sama: http://192.168.1.8:3000
echo ========================================================
start http://localhost:3000

pause
