# 🧠 Keterampilan Teknis & Kapabilitas Sistem
## Skills & Engineering Competencies Reference

Dokumen ini memetakan seluruh keahlian teknis (*skills*), kapabilitas rekayasa perangkat lunak (*software engineering competencies*), serta metodologi yang diimplementasikan pada proyek **Smart Solid Waste Management System**.

---

## 1. Computer Vision & Kecerdasan Buatan (*Artificial Intelligence*)

### 🎯 Kapabilitas yang Diterapkan:
- **Real-Time Object Detection**:
  - Deteksi objek sampah dari video stream kamera webcam dan foto statis secara *real-time* dengan latensi rendah (<300ms/frame).
- **Multi-Model Inference & Non-Maximum Suppression (NMS)**:
  - Menggabungkan probabilitas prediksi dari beberapa model pendeteksi objek secara simultan.
  - Menerapkan kalkulasi Intersection over Union (IoU) dinamis untuk mengeliminasi kotak deteksi duplikat atau tumpang tindih.
- **False-Positive Filtering & Face Detection Discard**:
  - Integrasi OpenCV Haar Cascade Classifier untuk mendeteksi wajah dan tubuh manusia secara otomatis, mencegah kesalahan deteksi sampah pada manusia.
- **Dynamic Bounding Box Scaling**:
  - Normalisasi koordinat piksel mentah menjadi persentase `(0 - 100%)` sehingga kotak penanda AI responsif terhadap berbagai ukuran layar perangkat (HP, Tablet, Laptop, Desktop).
- **Bilingual Contextual Mapping**:
  - Pemetaan kelas deteksi AI ke Bahasa Indonesia lengkap dengan kategori tempat sampah dan panduan daur ulang.

---

## 2. Frontend Engineering & Web UI/UX

### 🎯 Kapabilitas yang Diterapkan:
- **React Native for Web & TypeScript**:
  - Arsitektur berbasis komponen (*component-driven architecture*) dengan *strict type safety* (`tsc --noEmit` 0 error).
- **Modern Split-Screen Dashboard Layout**:
  - Desain *dashboard* 2 kolom (*side-by-side*) bebas *scrolling* yang menggabungkan area pemindai AI di sisi kiri dengan peta sebaran dan laporan aktif di sisi kanan.
- **Direct Webcam Shutter Integration**:
  - Penggunaan `navigator.mediaDevices.getUserMedia` langsung pada elemen `<video>` HTML5 dengan tombol rana (*shutter*) untuk pengalaman jepret foto instan tanpa harus membuka dialog file OS.
- **Precision Snug-Fit Button UI**:
  - Desain tombol ergonomis (*pill & rounded style*) dengan perataan tengah (*center alignment*) yang pas mengikuti panjang teks dan ikon tanpa ruang kosong memanjang.
- **Canvas-Based Image Annotation**:
  - Pembakaran (*burned-in*) kotak penanda deteksi AI secara permanen ke dalam kanvas gambar saat laporan dibuat untuk bukti audit visual yang valid.

---

## 3. Sistem Informasi Geografis (GIS) & Pemetaan Spasial

### 🎯 Kapabilitas yang Diterapkan:
- **Leaflet OpenStreetMap Integration**:
  - Integrasi peta open-source interaktif berkinerja tinggi tanpa dependensi API key berbayar.
- **Live GPS Tracking & Centering**:
  - Penentuan posisi pengguna secara presisi menggunakan HTML5 Geolocation API dengan fallback ke Geo-IP service.
  - Marker lokasi pengguna beranimasi denyut biru (*pulsating blue dot*) dengan tombol auto-center *"🎯 Ke Posisi Saya"*.
- **Interactive Waste Hotspot Pins**:
  - Penanda titik sampah merah (`🗑️`) yang dapat diklik untuk menampilkan *pop-up* pratinjau foto, jumlah sampah, dan alamat patokan lokasi.
- **Cross-Tab Synchronization**:
  - Peta sebaran otomatis terintegrasi baik pada tab **Dashboard Utama** maupun tab **Riwayat Laporan**.

---

## 4. Backend Microservices & API Engineering

### 🎯 Kapabilitas yang Diterapkan:
- **FastAPI Microservices**:
  - Pemrosesan request HTTP asinkron berbasis Python dengan performa tinggi.
- **Image Decoding & Memory Buffer Processing**:
  - Penerimaan payload gambar Base64 / Data URL yang didecode langsung di memori RAM menggunakan `numpy` dan `cv2.imdecode` tanpa menulis file sementara ke disk, memaksimalkan kecepatan I/O.
- **CORS & Endpoint Security Hardening**:
  - Konfigurasi proteksi CORS dan sanitasi struktur respon JSON untuk menyembunyikan detail arsitektur internal server.

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
| **AI & Computer Vision** | Python, OpenCV, PyTorch, Ultralytics, NumPy | Deteksi sampah real-time, NMS, filter wajah, normalisasi koordinat |
| **Frontend Framework** | React Native, Expo Web, TypeScript, CSS | Split-screen dashboard, canvas annotation, animasi laser |
| **GIS & Geolocation** | Leaflet, OpenStreetMap, Geolocation API | Peta sebaran sampah, tracking GPS pengguna, pin interaktif |
| **Backend & API** | FastAPI, Uvicorn, REST API | Endpoint `/detect` dan `/health`, decoding base64 in-memory |
| **Quality & Security** | TypeScript, ESLint, Git, .gitignore | Strict Typecheck, sanitasi data respon, proteksi repositori |
