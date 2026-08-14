# 🚀 Panduan Lengkap Deploy Online (GitHub Pages & Cloud AI)
## Platform SpotBersih - Pantau Sampah, Bersihkan Bersama

Dokumen ini menjelaskan secara lengkap arsitektur dan langkah-langkah *deployment* **SpotBersih** agar dapat diakses publik dari browser smartphone maupun laptop di mana saja.

---

## 📋 Ikhtisar Arsitektur Deployment:
1. **Frontend Web App (`SpotBersih`)**: Di-host di **GitHub Pages** ([https://franswaas.github.io/spotbersih/](https://franswaas.github.io/spotbersih/)).
2. **Backend AI Engine (`YOLO API`)**:
   - **Opsi A (Hybrid Lokal & Global Tunnel)**: Menjalankan server AI di laptop dan menyambungkannya ke internet via **Cloudflare Quick Tunnel** (Sangat cepat dan gratis).
   - **Opsi B (Cloud Hosted)**: Di-host di **Hugging Face Spaces** (Docker/FastAPI).

---

## 1️⃣ Bagian 1: Menjalankan Sistem Lokal & Tunnel Global (1-Click)

Cara termudah dan paling stabil untuk menghubungkan smartphone di luar rumah dengan AI engine di laptop Anda:

1. **Jalankan Skrip Otomatis**:
   Cukup klik ganda file **`start_spotbersih.bat`** di folder utama proyek.
2. Skrip akan membuka 3 proses otomatis:
   - Server AI YOLO di `http://127.0.0.1:8000`.
   - Cloudflare Quick Tunnel yang menghasilkan URL publik HTTPS instan (contoh: `https://xxxx-xxxx.trycloudflare.com`).
   - Server Web Frontend di `http://localhost:3000`.
3. Buka **[https://franswaas.github.io/spotbersih/](https://franswaas.github.io/spotbersih/)** di smartphone Anda untuk langsung memindai sampah dengan kamera HP!

---

## 2️⃣ Bagian 2: Deploy Frontend Web ke GitHub Pages

### Langkah 1: Ekspor Bundel Web Bersih
Di terminal proyek, jalankan:
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
git commit -m "feat: update build & documentation"
git push origin main
```

### Langkah 3: Konfigurasi GitHub Pages
1. Buka repositori Anda di GitHub $\rightarrow$ Tab **Settings** $\rightarrow$ **Pages**.
2. Pada bagian **Build and deployment**:
   - **Source**: Pilih **Deploy from a branch**.
   - **Branch**: Pilih `main` dan folder `/ (root)` atau gunakan workflow GitHub Actions yang telah disediakan di `.github/workflows/deploy.yml`.
3. Aplikasi web Anda langsung aktif di:
   👉 **`https://franswaas.github.io/spotbersih/`**

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
3. Setelah status Space menjadi **Running**, gunakan URL endpoint (misal `https://USERNAME-spotbersih-api.hf.space`) sebagai target API backend.

---

## 🎉 Hasil Akhir:
- **Aplikasi Web**: Aktif di `https://franswaas.github.io/spotbersih/`.
- **Deteksi AI**: Beroperasi *real-time* via Cloudflare Tunnel / Hugging Face.
- **Geolokasi**: Terhubung langsung ke sensor GPS perangkat pengguna dan peta Leaflet OpenStreetMap.
