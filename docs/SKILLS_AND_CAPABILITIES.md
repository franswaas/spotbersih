# 🧠 Keterampilan Teknis & Kapabilitas Sistem
## SpotBersih - Skills & Engineering Competencies Reference

Dokumen ini memetakan seluruh keahlian teknis (*skills*), kapabilitas rekayasa perangkat lunak (*software engineering competencies*), serta metodologi yang diimplementasikan pada proyek **SpotBersih (Smart Solid Waste Management System)**.

---

## 1. Computer Vision & Kecerdasan Buatan (*Artificial Intelligence*)

### 🎯 Kapabilitas yang Diterapkan:
- **Real-Time Object Detection**:
  - Deteksi objek sampah dari video stream kamera webcam dan foto statis secara *real-time* dengan latensi rendah (<200ms/frame).
- **Non-Maximum Suppression (NMS) & Model Filtering**:
  - Menggabungkan probabilitas prediksi dari model YOLO dan menerapkan kalkulasi Intersection over Union (IoU) dinamis untuk mengeliminasi kotak deteksi duplikat atau tumpang tindih.
- **False-Positive Filtering & Face Detection Discard**:
  - Integrasi OpenCV Haar Cascade Classifier untuk mendeteksi wajah dan tubuh manusia secara otomatis, mencegah kesalahan deteksi sampah pada manusia.
- **Dynamic Bounding Box Scaling**:
  - Normalisasi koordinat piksel mentah menjadi persentase `(0 - 100%)` sehingga kotak penanda AI responsif terhadap berbagai ukuran layar perangkat (HP, Tablet, Laptop, Desktop).
- **Bilingual Contextual Mapping**:
  - Pemetaan kelas deteksi AI ke Bahasa Indonesia lengkap dengan 4 kategori tempat sampah dan rekomendasi penanganan lingkungan.

---

## 2. Frontend Engineering & Web UI/UX

### 🎯 Kapabilitas yang Diterapkan:
- **React Native for Web & TypeScript**:
  - Arsitektur berbasis komponen (*component-driven architecture*) dengan *strict type safety* (`tsc --noEmit` 0 error).
- **Modern Split-Screen Dashboard Layout**:
  - Desain *dashboard* 2 kolom (*side-by-side*) bebas *scrolling* yang menggabungkan area pemindai AI di sisi kiri dengan peta sebaran dan laporan aktif di sisi kanan.
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

## 4. Backend Microservices, Networking, & Tunneling

### 🎯 Kapabilitas yang Diterapkan:
- **FastAPI Microservices**:
  - Pemrosesan request HTTP asinkron berbasis Python dengan performa tinggi.
- **Image Decoding & In-Memory Buffer**:
  - Payload Base64 didecode langsung di RAM menggunakan `numpy` dan `cv2.imdecode` tanpa menulis file sementara ke disk, memaksimalkan kecepatan I/O.
- **Cloudflare Quick Tunnel Integration**:
  - Menghubungkan server lokal FastAPI ke internet publik dengan enkripsi TLS/HTTPS aman menggunakan `cloudflared.exe`, memungkinkan smartphone di jaringan 4G/5G berkomunikasi langsung dengan AI server lokal.

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
| **AI & Computer Vision** | Python, OpenCV, PyTorch, Ultralytics YOLO, NumPy | Deteksi sampah real-time, NMS, filter wajah, normalisasi koordinat |
| **Frontend Framework** | React Native, Expo Web, TypeScript, CSS | Split-screen dashboard, in-memory Base64 assets, font injection |
| **GIS & Geolocation** | Leaflet, OpenStreetMap, Nominatim, Geolocation API | Peta sebaran sampah, tracking GPS perangkat, tap-to-pin interaktif |
| **Networking & Tunneling**| Cloudflare Tunnel, FastAPI, Uvicorn, REST API | Enkripsi HTTPS, tunneling lintas jaringan 4G/5G, decoding RAM |
| **Quality & Security** | TypeScript, ESLint, Git, .gitignore | Strict Typecheck, sanitasi data respon, proteksi repositori |
