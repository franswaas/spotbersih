---
title: SpotBersih AI Detection API
emoji: ♻️
colorFrom: green
colorTo: emerald
sdk: docker
app_port: 7860
pinned: false
---

# ♻️ SpotBersih - AI Waste Detection Engine
Backend API pendeteksi sampah otomatis untuk platform **SpotBersih**.
Ditenagai oleh FastAPI, OpenCV, dan YOLO Multi-Model Ensemble.

### Endpoint:
- `GET /health`: Cek status server online.
- `POST /detect`: Deteksi objek sampah dari gambar base64.
