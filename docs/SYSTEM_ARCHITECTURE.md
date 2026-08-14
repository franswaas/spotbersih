# 📘 Dokumentasi Arsitektur & Spesifikasi Sistem
## SpotBersih - Pantau Sampah, Bersihkan Bersama
### Arsitektur Teknis Terpadu (AI, GIS, & Frontend Web Engine)

---

## 1. Ringkasan Eksekutif
**SpotBersih** adalah platform web dan mobile pintar berbasis Artificial Intelligence (AI) dan Sistem Informasi Geografis (GIS) yang dirancang untuk mendeteksi, mengklasifikasikan, serta memetakan sebaran sampah liar secara *real-time*. Platform ini mengusung filosofi **"Warga Bantu Warga" (Civic Action)**, di mana masyarakat dapat bergotong royong melaporkan titik sampah dan menandai area yang telah dibersihkan guna menjaga kebersihan lingkungan bersama.

---

## 2. Diagram Arsitektur Sistem (*System Architecture*)

```mermaid
graph TD
    A[Kamera Laptop / Smartphone] -->|Stream Video / Jepret Foto| B[Frontend: React Native Web / Expo]
    B -->|Hardware Geolocation Sensor| C[Leaflet OpenStreetMap GIS]
    B -->|Base64 Image Payload| D[Cloudflare Tunnel / HTTPS Gateway]
    D -->|HTTP POST /detect| E[Backend AI Engine: Python FastAPI]
    E -->|Deteksi Objek & Klasifikasi YOLO| F[YOLO Model Inference]
    F -->|NMS + Filter Wajah + Anotasi| E
    E -->|Bounding Boxes & Kategori Bahasa Indonesia| B
    B -->|Penyimpanan Laporan Lokal Persisten| G[Local Storage Data Store]
    G -->|Render Pin Sebaran & Arsip Riwayat| C
```

---

## 3. Komponen Arsitektur Utama

### A. Frontend Web & Mobile (React Native for Web + Expo)
1. **Split-Screen Dashboard Ergonomis**:
   - Layout 2 kolom responsif (*desktop/tablet*) dan bertumpuk mulus (*smartphone*) tanpa *scrolling* berlebih.
   - Sisi kiri didedikasikan untuk modul pemindai AI (**Live Cam AI Scanner** & **Jepret / Unggah Foto**).
   - Sisi kanan didedikasikan untuk **Peta Sebaran Sampah Interaktif** dan daftar **Laporan Aktif Warga**.
2. **Arsitektur Aset In-Memory Base64**:
   - Semua logo, ikon kamera, dan ilustrasi di-render menggunakan konstanta *Base64 in-memory* di `app/src/constants/assets.ts`, mengeliminasi error *404 File Not Found* atau *image flicker*.
3. **Injeksi Font Vektor Tanpa Request Jaringan**:
   - Font icon `Ionicons.ttf` diinjeksi langsung dalam bentuk *Base64 `@font-face`* ke dalam `dist/index.html` via `fix_paths.py`, menjamin seluruh ikon muncul sempurna di semua browser tanpa kotak kosong (*rectangle fallback*).
4. **Anti-Cache Invalidation System**:
   - Skrip `fix_paths.py` menambahkan meta tag anti-cache (`Cache-Control: no-cache, no-store, must-revalidate`) dan parameter *query string* versi unik (`?v=<timestamp>`) pada seluruh bundel JavaScript untuk mencegah browser menyimpan cache basi.

---

### B. Lapisan Spasial & Sistem Informasi Geografis (GIS)
1. **Sensor GPS Hardware Murni (*Pure Hardware Geolocation*)**:
   - Menggunakan `navigator.geolocation.getCurrentPosition` langsung pada chip GPS perangkat tanpa perkiraan server internet (*zero IP guessing*).
   - Menjamin bahwa ketika GPS perangkat mati, sistem dengan jujur berstatus `🔴 GPS Belum Aktif`.
   - Ketika GPS dinyalakan dan diizinkan, koordinat langsung terkunci dengan akurasi meter.
2. **Pencarian Alamat Otomatis (*Reverse Geocoding*)**:
   - Koordinat `(latitude, longitude)` otomatis diterjemahkan ke nama jalan, kelurahan, dan kecamatan menggunakan **OpenStreetMap Nominatim API**.
3. **Penetapan Titik Interaktif (*Interactive Tap-to-Pin*)**:
   - Pengguna dapat mengetuk (*click/tap*) titik mana saja pada peta Leaflet untuk memindahkan atau menentukan pin lokasi sampah secara presisi.
4. **Reaktivitas Iframe Dinamis (*Dynamic Iframe Key*)**:
   - Elemen peta di-render di dalam `<iframe>` dengan *reactive key* (`key={userPos.lat-userPos.lng}`) sehingga peta langsung memusatkan pandangan (*viewport centering*) ke lokasi pengguna seketika koordinat GPS terkunci.

---

### C. Backend AI Inference Engine (FastAPI + YOLO)
1. **Model Deteksi Objek**:
   - Menggunakan model Ultralytics YOLO berkecepatan tinggi yang dilatih untuk mengenali berbagai kategori sampah.
2. **Filter Wajah & Pencegahan False-Positive**:
   - Integrasi Haar Cascade Classifier untuk mendeteksi wajah/tubuh manusia dan mendiskualifikasi deteksi sampah yang tumpang tindih dengan manusia.
3. **Penerjemahan Kontekstual & 4 Kategori Pemilahan**:
   - Mengelompokkan setiap sampah ke dalam 4 kategori tempat sampah:
     - 🟡 **Daur Ulang (Recyclable)**
     - 🔘 **Residu (Non-Recyclable)**
     - 🟢 **Organik (Organic)**
     - 🔴 **B3 Berbahaya (Hazardous)**
4. **Validasi Wajib Deteksi**:
   - Tombol pengiriman laporan dikunci secara otomatis hingga AI mendeteksi minimal 1 objek sampah valid di dalam bingkai kamera.

---

### D. Jaringan & Konektivitas Global (Cloudflare Tunnel)
- Menggunakan **Cloudflare Quick Tunnel (`cloudflared.exe`)** yang menghubungkan server lokal FastAPI (port 8000) ke internet publik melalui enkripsi TLS/HTTPS tanpa perlu *port-forwarding* router atau IP publik statis.
- Memungkinkan smartphone yang terhubung ke jaringan seluler (4G/5G) berkomunikasi langsung dengan backend AI laptop.

---

## 4. Siklus Aksi Komunitas ("Warga Bantu Warga")

```
[1. 📸 Lapor Sampah] ──> Warga memindai dan mengirim laporan titik sampah ber-GPS.
          │
          ▼
[2. 🤝 Gotong Royong] ──> Warga sekitar melihat titik sampah pada peta dan membersihkannya bersama.
          │
          ▼
[3. 🧹 Hapus Laporan] ──> Warga menekan "Tandai Bersih & Hapus" untuk memperbarui peta secara real-time.
```

---

## 5. Ringkasan Endpoint API Backend

| Method | Endpoint | Deskripsi | Payload / Respon |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Memeriksa status kesehatan server AI | `{"status": "online", "model": "loaded"}` |
| `POST` | `/detect` | Mengirim gambar untuk inferensi deteksi sampah | **Req**: `{"image": "data:image/jpeg;base64,..."}`<br>**Res**: `{"detections": [...], "count": 2}` |

---

## 6. Prosedur Audit & Pengujian Mutu
1. **Type Safety**: Menjalankan `npm run typecheck` (`tsc --noEmit`) dengan standar nol toleransi error.
2. **Kompilasi Web**: Menjalankan `npx expo export --platform web && python fix_paths.py` untuk menghasilkan bundel produksi bersih di `dist/`.
3. **Penyajian Web**: Menjalankan `npx serve -l 3000 dist` atau mengakses GitHub Pages `https://franswaas.github.io/spotbersih/`.
