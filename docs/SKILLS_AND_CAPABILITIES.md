# 🧠 Keterampilan Teknis & Kapabilitas Sistem
## SpotBersih - Skills & Engineering Competencies Reference

Dokumen ini memetakan seluruh keahlian teknis (*skills*), kapabilitas rekayasa perangkat lunak (*software engineering competencies*), serta metodologi yang diimplementasikan pada proyek **SpotBersih (Smart Solid Waste Management System)**.

---

## 1. Computer Vision & Kecerdasan Buatan (*Artificial Intelligence*)

### 🎯 Kapabilitas yang Diterapkan:
- **Multi-Model Object Detection Architecture**:
  - Orkestrasi tiga bobot model YOLO (Hrutik 8-Class, Roboflow 22-Class, Underwater Denoised 15-Class) untuk deteksi sampah yang komprehensif di berbagai medan.
- **Real-Time Video Stream Inference**:
  - Deteksi objek sampah dari video stream kamera webcam dan foto statis secara *real-time* dengan latensi rendah (<200ms/frame).
- **Non-Maximum Suppression (NMS) & Confidence Filtering**:
  - Menggabungkan probabilitas prediksi dari model YOLO dan menerapkan kalkulasi Intersection over Union (IoU) dinamis untuk mengeliminasi kotak deteksi duplikat atau tumpang tindih.
- **False-Positive Filtering & Face Detection Discard**:
  - Integrasi OpenCV Haar Cascade Classifier untuk mendeteksi wajah dan tubuh manusia secara otomatis, mencegah kesalahan deteksi sampah pada manusia.
- **Dynamic Bounding Box Scaling & Permanent Stamping**:
  - Normalisasi koordinat piksel mentah menjadi persentase `(0 - 100%)` sehingga kotak penanda AI responsif terhadap berbagai ukuran layar, serta pematrian permanen kotak penanda tebal (4px) ke kanvas gambar laporan sebelum dikirim.
- **Bilingual Contextual Mapping**:
  - Pemetaan kelas deteksi AI ke Bahasa Indonesia lengkap dengan 4 kategori tempat sampah dan rekomendasi penanganan lingkungan.

---

## 2. Frontend Engineering & Web UI/UX

### 🎯 Kapabilitas yang Diterapkan:
- **React Native for Web & TypeScript**:
  - Arsitektur berbasis komponen (*component-driven architecture*) dengan *strict type safety* (`tsc --noEmit` 0 error).
- **Full-Screen High-Resolution Lightbox Modal**:
  - Modal pembesar foto sinematik bertema *Dark-Glassmorphism* dengan visualisasi *bounding box*, pill kategori sampah terdeteksi, dan aksi 1-klik *Tandai Bersih*.
- **Single-Card Containment Architecture**:
  - Desain *dashboard* 2 kolom seimbang di mana peta dan banner konfirmasi *`✨ Semua Lokasi Bersih & Asri`* terbungkus rapi di dalam satu kartu tanpa *visual overflow*.
- **Dynamic AI Connection Switcher & LocalStorage Persistence**:
  - Rekayasa modal konfigurasi backend interaktif yang memungkinkan pengguna mengganti endpoint API secara *on-the-fly* dengan validasi status `/health` instan.
- **Direct Webcam Shutter Integration**:
  - Penggunaan `navigator.mediaDevices.getUserMedia` langsung pada elemen `<video>` HTML5 dengan tombol rana (*shutter*) untuk pengalaman jepret foto instan tanpa harus membuka dialog file OS.
- **In-Memory Base64 Asset Engineering**:
  - Seluruh logo dan ikon disematkan sebagai string Base64 langsung dalam memori JavaScript (`app/src/constants/assets.ts`), mengeliminasi masalah *missing assets* dan *404 File Not Found*.
- **Zero-Network Vector Font Injection**:
  - Injeksi langsung font `Ionicons.ttf` dalam format Base64 `@font-face` ke dalam file `dist/index.html` via `fix_paths.py`, memastikan seluruh ikon tampil sempurna tanpa kotak kosong.
- **Anti-Cache Invalidation System**:
  - Penyisipan header anti-cache dan parameter query versi unik (`?v=<timestamp>`) untuk menjamin pengguna selalu menerima versi aplikasi terbaru tanpa tersangkut cache browser lama.

---

## 3. Sistem Informasi Geografis (GIS) & Pemetaan Spasial

### 🎯 Kapabilitas yang Diterapkan:
- **Pure Device Hardware Geolocation**:
  - Pengambilan koordinat GPS langsung dari chip sensor hardware perangkat (`navigator.geolocation.getCurrentPosition`) tanpa penebakan ISP/IP provider yang tidak akurat.
- **OpenStreetMap Nominatim Reverse Geocoding**:
  - Konversi otomatis titik koordinat lintang dan bujur menjadi alamat jalan, kelurahan, dan kota secara *real-time*.
- **Interactive Spatial Tap-to-Pin**:
  - Fitur ketuk peta interaktif yang memungkinkan pengguna menyesuaikan dan menancapkan pin lokasi sampah langsung ke gang/titik yang diinginkan.
- **Dynamic Iframe Key Reactivity**:
  - Penggunaan *reactive key* pada iframe Leaflet sehingga peta langsung melompat dan memusatkan pandangan (*viewport auto-center*) ke posisi pengguna seketika GPS terkunci.

---

## 4. Backend Microservices, Networking, & Cross-Device Synchronization

### 🎯 Kapabilitas yang Diterapkan:
- **FastAPI Microservices**:
  - Pemrosesan request HTTP asinkron berbasis Python dengan performa tinggi untuk deteksi dan manajemen database laporan.
- **Cross-Device Real-Time Sync Engine**:
  - Sinkronisasi instan antara laptop, smartphone, dan tablet melalui endpoint `/reports` terpusat dengan mekanisme anti-resurrection.
- **Smart Image Downscaling**:
  - Kompresi kanvas pintar ($960 \times 720$ px, 76% JPEG quality) memangkas beban payload sebesar 98% (~70 KB) untuk transmisi data super cepat.
- **Cloudflare Quick Tunnel Integration & Mixed Content Solution**:
  - Menghubungkan server lokal FastAPI ke internet publik dengan enkripsi TLS/HTTPS aman menggunakan `cloudflared.exe`, mengatasi blokade *Mixed Content* saat diakses dari GitHub Pages.

---

## 5. Civic Tech & Rekayasa Komunitas ("Warga Bantu Warga")

### 🎯 Kapabilitas yang Diterapkan:
- **Siklus Aksi 3 Langkah**:
  - Mengubah aplikasi pasif menjadi platform kolaboratif: `📸 Lapor` $\rightarrow$ `🤝 Gotong Royong Bersihkan` $\rightarrow$ `✨ Hapus Laporan`.
- **Edukasi Pemilahan Sampah Terpadu**:
  - Ensiklopedia pemilahan 4 kategori (Daur Ulang, Residu, Organik, B3) lengkap dengan tips praktis pengelolaan lingkungan.
- **Validasi Ketat Sebelum Pelaporan**:
  - Mencegah spam atau laporan kosong dengan memvalidasi keberadaan sampah terdeteksi sebelum pengiriman diizinkan.

---

## 6. Ringkasan Matriks Keahlian

| Bidang | Teknologi / Tools | Implementasi Nyata pada Proyek |
| :--- | :--- | :--- |
| **AI & Computer Vision** | Python, OpenCV, PyTorch, Ultralytics YOLO, NumPy | Multi-model YOLO inference, NMS, filter wajah, normalisasi koordinat |
| **Frontend Framework** | React Native, Expo Web, TypeScript, CSS | Split-screen dashboard, Lightbox modal, in-memory Base64 assets, dynamic AI switcher |
| **Cross-Device Sync** | FastAPI, Axios, LocalStorage, JSON Store | Single source of truth, auto 3s sync, smart 98% image compression |
| **GIS & Geolocation** | Leaflet, OpenStreetMap, Nominatim, Geolocation API | Peta sebaran sampah, tracking GPS perangkat, tap-to-pin interaktif |
| **Networking & Tunneling**| Cloudflare Tunnel, FastAPI, Uvicorn, REST API | Enkripsi HTTPS, penanganan Mixed-Content, tunneling 4G/5G, in-memory decoding |
| **Quality & Security** | TypeScript, ESLint, Git, .gitignore | Strict Typecheck, sanitasi data respon, proteksi repositori |
