# 🚀 Panduan Lengkap Deploy Online (GitHub Pages & Cloud AI)
## Platform SpotBersih - Pantau Sampah, Bersihkan Bersama

Dokumen ini menjelaskan secara lengkap arsitektur dan langkah-langkah *deployment* **SpotBersih** agar dapat diakses publik dari browser smartphone maupun laptop di mana saja dengan performa deteksi AI yang optimal serta sinkronisasi multi-perangkat secara *real-time*.

---

## 📋 Ikhtisar Arsitektur Deployment

1. **Frontend Web App (`SpotBersih`)**: Di-host secara gratis dan otomatis di **GitHub Pages** ([https://franswaas.github.io/spotbersih/](https://franswaas.github.io/spotbersih/)).
2. **Backend AI Engine & Database Terpusat (`YOLO API + Shared Reports`)**:
   - **Opsi A (Hybrid Lokal & Cloudflare Tunnel - Direkomendasikan)**: Menjalankan server AI & database sinkronisasi di laptop dan menyambungkannya ke internet via **Cloudflare Quick Tunnel** (Sangat cepat, latensi rendah, GPU terakselerasi, dan gratis).
   - **Opsi B (Cloud Hosted 24 Jam)**: Di-host di **Hugging Face Spaces** (Docker/FastAPI).

---

## 🔒 Pemahaman Masalah Keamanan Browser (HTTPS vs HTTP)

Saat mengakses aplikasi dari **GitHub Pages (`https://...`)**:
- Browser modern memberlakukan aturan keamanan ketat **Mixed Content Blocking**, di mana halaman HTTPS dilarang memanggil API yang menggunakan protokol HTTP biasa (`http://127.0.0.1:8000` atau `http://<IP-Laptop>:8000`).
- Selain itu, alamat `127.0.0.1` pada smartphone akan mencari server di HP itu sendiri, bukan di laptop Anda.
- **Solusi**: Menggunakan **Cloudflare HTTPS Quick Tunnel** (`https://xxxx.trycloudflare.com`) atau **Hugging Face Space HTTPS**.

---

## 1️⃣ Bagian 1: Menjalankan Sistem Hybrid Lokal & Tunnel Global (1-Click)

Cara termudah dan paling stabil untuk menghubungkan smartphone di mana saja dengan AI engine di laptop Anda:

1. **Jalankan Skrip Otomatis**:
   Cukup klik ganda file **`start_spotbersih.bat`** di folder utama proyek.
2. Skrip akan membuka 3 jendela proses:
   - Server AI YOLO & Database Sinkronisasi di `http://127.0.0.1:8000`.
   - Cloudflare Quick Tunnel yang menghasilkan URL publik HTTPS instan (contoh: `https://absent-driving-someone-rural.trycloudflare.com`).
   - Server Web Frontend Lokal di `http://localhost:3000`.
3. **Hubungkan di Smartphone / GitHub Pages**:
   - Buka **[https://franswaas.github.io/spotbersih/](https://franswaas.github.io/spotbersih/)** di smartphone Anda.
   - Klik tombol **`AI Offline ⚙️` / `AI Aktif`** di samping tab pemindai.
   - Pilih **"Gunakan Cloudflare Tunnel Aktif"** (atau tempel URL dari terminal Cloudflare).
   - Klik **"Simpan & Tes Koneksi"**.
   - Status seketika berubah menjadi **🟢 AI Aktif** dan kamera smartphone langsung mendeteksi sampah serta menyinkronkan laporan ke laptop secara instan.

---

## 2️⃣ Bagian 2: Deploy Frontend Web ke GitHub Pages

### Langkah 1: Ekspor Bundel Web Bersih
Di terminal proyek:
```bash
cd app
npm run typecheck
npx expo export --platform web
python fix_paths.py
```
*(Skrip `fix_paths.py` otomatis menginjeksi font vektor Base64 dan parameter anti-cache ke `dist/index.html`)*.

### Langkah 2: Push ke Repositori GitHub
```bash
git add .
git commit -m "feat: update build & dynamic ai server url"
git push origin main
```

### Langkah 3: Konfigurasi GitHub Actions
Workflow otomatis di `.github/workflows/deploy.yml` dengan lingkungan Python 3.11 akan secara otomatis mengompilasi dan menayangkan versi terbaru ke GitHub Pages dalam hitungan 1-2 menit.

---

## 3️⃣ Bagian 3: Deploy Backend AI ke Hugging Face Spaces (Opsional 24 Jam)

Jika Anda ingin backend AI berjalan 24 jam nonstop tanpa perlu laptop menyala:

1. Buat Space baru di [https://huggingface.co/new-space](https://huggingface.co/new-space):
   - **Space name**: `spotbersih-api`
   - **Space SDK**: **Docker** $\rightarrow$ **Blank**
   - **Visibility**: **Public**
2. Upload berkas dari folder `hf_space/`:
   ```bash
   cd "C:\Users\asus tuf\Downloads\smart-solid-waste-management-main\smart-solid-waste-management-main\hf_space"
   git init
   git add .
   git commit -m "Deploy SpotBersih AI Engine"
   git remote add origin https://huggingface.co/spaces/USERNAME/spotbersih-api
   git branch -M main
   git push -u origin main --force
   ```
3. Setelah status Space menjadi **Running**, gunakan URL endpoint (misal `https://USERNAME-spotbersih-api.hf.space`) dan tempelkan ke modal Pengaturan Server AI di aplikasi web.

---

## 🎉 Hasil Akhir:
- **Aplikasi Web**: Aktif di `https://franswaas.github.io/spotbersih/`.
- **Deteksi AI & Sinkronisasi**: Beroperasi *real-time* via Cloudflare Tunnel / Hugging Face.
- **Pratinjau Lightbox**: Zoom foto resolusi tinggi dengan bounding boxes AI.
- **Geolokasi**: Terhubung langsung ke sensor GPS perangkat pengguna dan peta Leaflet OpenStreetMap.
- **Manajemen Server Fleksibel**: Pengguna dapat mengganti URL AI kapan saja langsung dari tampilan web tanpa perlu redeploy kode.
