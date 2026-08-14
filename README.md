# 🌿 SpotBersih - Pantau Sampah, Bersihkan Bersama
### Smart AI-Powered Solid Waste Management & Citizen Action System

Platform web & mobile pintar berbasis **Artificial Intelligence (Computer Vision)** dan **Sistem Informasi Geografis (GIS)** untuk mendeteksi jenis sampah secara *real-time*, mengunci lokasi GPS presisi perangkat warga, dan memetakan sebaran titik sampah untuk aksi gotong royong kebersihan lingkungan.

---

## 🌐 Akses Publik & Live Deployment

- **Frontend Web App (GitHub Pages)**: [https://franswaas.github.io/spotbersih/](https://franswaas.github.io/spotbersih/)
- **Lokal Dev Server**: `http://localhost:3000` (atau via Wi-Fi lokal `http://<IP-Laptop>:3000`)
- **Backend AI Engine (FastAPI YOLO)**: Terhubung secara global melalui Cloudflare Quick Tunnel / Hugging Face Spaces.

---

## 📚 Technical Documentation & System Specifications

- 📘 **[Arsitektur & Spesifikasi Sistem](docs/SYSTEM_ARCHITECTURE.md)**: Rincian arsitektur frontend, backend AI YOLO, layer GIS Leaflet, dan alur data.
- 🧠 **[Matriks Keahlian & Rekayasa Perangkat Lunak](docs/SKILLS_AND_CAPABILITIES.md)**: Pemetaan kompetensi Computer Vision, GIS, React Native Web, dan Security Hardening.
- 🚀 **[Panduan Deployment Online](docs/DEPLOYMENT_GUIDE.md)**: Panduan langkah demi langkah deploy ke GitHub Pages & Cloudflare / Hugging Face.

---

## ✨ Fitur Unggulan Sistem

### 1. 🤖 Deteksi Sampah Real-Time Berbasis AI (Computer Vision)
- **Live Cam AI Scanner**: Memindai objek sampah secara langsung dari webcam laptop atau kamera smartphone dengan animasi laser pemindai dan penanda kotak (*bounding box*) berkecepatan tinggi (<200ms).
- **Jepret / Unggah Foto**: Mengambil foto instan langsung dari rana kamera (*direct camera shutter*) atau memilih berkas dari galeri.
- **Validasi AI Ketat & Filter Wajah**: Mengeliminasi *false-positive* pada wajah/tubuh manusia dan hanya mengizinkan pengiriman laporan jika sampah valid berhasil terdeteksi.

### 2. 🗺️ Geolokasi Hardware Murni & Peta Sebaran Interaktif
- **Pure Device GPS Sensor**: Membaca sensor GPS fisik perangkat secara langsung tanpa menggunakan tebakan provider IP yang sering meleset.
- **Pencarian Nama Jalan Otomatis**: Koordinat GPS otomatis diterjemahkan menjadi nama jalan, kelurahan, dan kecamatan via *OpenStreetMap Reverse Geocoding*.
- **Interactive Tap-to-Pin**: Pengguna dapat mengetuk (*click/tap*) titik mana saja pada peta untuk menyesuaikan dan menetapkan pin lokasi sampah secara presisi.
- **Iframe Reactive Key**: Peta Leaflet secara dinamis memusatkan tampilan ke koordinat pengguna dengan animasi denyut biru (`🔵 Posisi Anda`).

### 3. 🤝 Aksi Komunitas "Warga Bantu Warga"
- **Pantau Sebaran Titik Sampah**: Warga dapat melihat titik sampah terdekat yang dilaporkan lengkap dengan foto bukti dan jumlah sampah.
- **1-Click Bersihkan & Hapus**: Setelah sampah dibersihkan secara gotong royong, warga dapat menekan *"🧹 Tandai Bersih & Hapus"* untuk menjaga lingkungan dan memperbarui peta secara *real-time*.

### 4. 📚 Modul Edukasi Pemilahan 4 Kategori Sampah
- Katalog edukasi lengkap pemilahan: **Daur Ulang (Kuning)**, **Residu (Abu-abu)**, **Organik (Hijau)**, dan **B3 Berbahaya (Merah)** beserta tips pengelolaan lingkungan.

---

## 🛠️ Arsitektur Teknologi

```mermaid
graph TD
    A[Kamera Laptop / HP] -->|Video Stream / Snapshot| B[Frontend: React Native Web / Expo]
    B -->|Sensor Geolocation API| C[Leaflet OpenStreetMap GIS]
    B -->|Base64 Image Payload| D[AI Backend: FastAPI + YOLO]
    D -->|NMS + Filter Objek Sampah| E[Inference Engine]
    E -->|Bounding Box & Kategori| B
    B -->|Penyimpanan Laporan Real-Time| F[Persistent Local Storage]
    F -->|Render Pin & Arsip Riwayat| C
```

- **Frontend**: React Native for Web, Expo, TypeScript, In-Memory Base64 Assets, Font Injection Engine.
- **GIS Layer**: Leaflet JS, OpenStreetMap, Nominatim Reverse Geocoding API.
- **AI Backend**: Python FastAPI, Ultralytics YOLO, OpenCV, NumPy, Uvicorn.
- **Networking**: Cloudflare Quick Tunnel (`cloudflared.exe`) untuk akses global lintas jaringan 4G/5G.

---

## 🚀 Panduan Menjalankan Sistem (1-Click Start)

### Cara Cepat (Windows):
Cukup klik ganda berkas **`start_spotbersih.bat`** di folder utama proyek. Skrip ini akan secara otomatis:
1. Memulai server AI FastAPI YOLO di port 8000.
2. Membuka Cloudflare Quick Tunnel untuk akses internet global.
3. Memulai server web frontend di port 3000.

### Cara Manual:

#### 1. Jalankan Backend AI YOLO:
```bash
python yolo_api_server.py
```
*(Berjalan di `http://127.0.0.1:8000`)*

#### 2. Jalankan Cloudflare Tunnel (Opsional untuk Akses Publik / HP Luar Wi-Fi):
```bash
.\cloudflared.exe tunnel --url http://127.0.0.1:8000
```

#### 3. Jalankan Frontend Web App:
```bash
cd app
npm run typecheck
npx expo export --platform web
python fix_paths.py
npx serve -l 3000 dist
```
Buka browser di **`http://localhost:3000`** atau akses online di **`https://franswaas.github.io/spotbersih/`**.

---

## 📂 Struktur Repositori

```
smart-solid-waste-management/
├── app/                           # Frontend React Native Web (Expo)
│   ├── src/
│   │   ├── components/            # Komponen UI (Peta Leaflet, Tombol, dsb.)
│   │   ├── constants/             # Konstanta Aset In-Memory Base64
│   │   ├── screens/               # Layar Utama (HomeScreen, Login, Edukasi)
│   │   └── services/              # Layanan Deteksi AI & Penyimpanan Laporan
│   ├── fix_paths.py               # Otomasi Injeksi Font Base64 & Cache Busters
│   └── package.json
├── docs/                          # Dokumentasi Teknis Lengkap
│   ├── SYSTEM_ARCHITECTURE.md     # Spesifikasi Arsitektur Sistem
│   ├── SKILLS_AND_CAPABILITIES.md # Matriks Keahlian & Rekayasa
│   └── DEPLOYMENT_GUIDE.md        # Panduan Deployment Cloud & GitHub
├── hf_space/                      # Konfigurasi Docker Hugging Face Spaces
├── ml_models/                     # Bobot Model YOLO Deteksi Sampah
├── yolo_api_server.py             # Server FastAPI YOLO
├── start_spotbersih.bat           # Skrip 1-Click Startup Windows
└── README.md                      # Dokumentasi Utama
```

---

## 📄 Lisensi
Proyek ini dikembangkan di bawah lisensi **MIT License**.
