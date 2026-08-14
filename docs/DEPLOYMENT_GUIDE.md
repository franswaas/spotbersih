# 🚀 Panduan Lengkap Deploy Online (GitHub & Hugging Face)
## Platform SpotBersih

Dokumen ini menjelaskan langkah demi langkah cara men-deploy **SpotBersih** agar dapat diakses publik secara online 24 jam gratis tanpa perlu laptop menyala.

---

## 📋 Ikhtisar Arsitektur Deployment:
1. **Frontend Web App (`SpotBersih`)**: Di-host secara gratis di **GitHub Pages** menggunakan **GitHub Actions**.
2. **Backend AI Engine (`YOLO API`)**: Di-host secara gratis di **Hugging Face Spaces** (Docker/FastAPI).

---

## 1️⃣ Bagian 1: Deploy Backend AI ke Hugging Face Spaces (Gratis)

### Langkah 1: Buat Akun & Space Baru di Hugging Face
1. Buka [https://huggingface.co](https://huggingface.co) dan login / buat akun.
2. Klik tombol **New** di pojok kanan atas $\rightarrow$ Pilih **New Space**.
3. Isi form:
   - **Space name**: `spotbersih-api`
   - **License**: `mit` / `apache-2.0`
   - **Space SDK**: Pilih **Docker** $\rightarrow$ **Blank**
   - **Visibility**: **Public**
4. Klik **Create Space**.

### Langkah 2: Upload File Backend ke Hugging Face
Buka terminal di komputer Anda, lalu jalankan perintah berikut:

```bash
# Pindah ke folder hf_space yang sudah disiapkan
cd "C:\Users\asus tuf\Downloads\smart-solid-waste-management-main\smart-solid-waste-management-main\hf_space"

# Inisialisasi Git untuk Hugging Face
git init
git add .
git commit -m "Deploy SpotBersih AI Engine"

# Hubungkan ke repository Hugging Face Anda (Ganti USERNAME dengan username Hugging Face Anda)
git remote add origin https://huggingface.co/spaces/USERNAME/spotbersih-api

# Push ke Hugging Face
git branch -M main
git push -u origin main --force
```

*(Hugging Face akan otomatis membangun Docker container dalam 2-3 menit. Setelah statusnya **Running**, Anda akan mendapatkan URL publik, contoh: `https://username-spotbersih-api.hf.space`)*.

---

## 2️⃣ Bagian 2: Deploy Frontend Web ke GitHub Pages

### Langkah 1: Buat Repository Baru di GitHub
1. Buka [https://github.com](https://github.com) $\rightarrow$ Klik **New repository**.
2. Beri nama: `spotbersih` (atau nama lain yang Anda inginkan) $\rightarrow$ Pilih **Public** $\rightarrow$ Klik **Create repository**.

### Langkah 2: Push Kode Proyek ke GitHub
Buka terminal di root proyek:

```bash
cd "C:\Users\asus tuf\Downloads\smart-solid-waste-management-main\smart-solid-waste-management-main"

git init
git add .
git commit -m "feat: inisialisasi SpotBersih web app & dokumentasi"

# Ganti USERNAME dengan username GitHub Anda
git remote add origin https://github.com/USERNAME/spotbersih.git
git branch -M main
git push -u origin main --force
```

### Langkah 3: Aktifkan GitHub Pages & Hubungkan URL AI
1. Di repository GitHub Anda, buka tab **Settings** $\rightarrow$ **Pages** (di menu sebelah kiri).
2. Pada bagian **Build and deployment** $\rightarrow$ **Source**: Ubah menjadi **GitHub Actions**.
3. *(Opsional)* Agar frontend otomatis terhubung ke Hugging Face:
   - Buka tab **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
   - Klik **New repository secret**.
   - **Name**: `EXPO_PUBLIC_AI_SERVER_URL`
   - **Secret**: Masukkan URL Hugging Face Anda (contoh: `https://username-spotbersih-api.hf.space`).
   - Klik **Add secret**.

---

## 🎉 Hasil Akhir:
- **Aplikasi Web**: Dapat diakses di `https://USERNAME.github.io/spotbersih/`
- **Backend AI**: Berjalan 24 jam nonstop di Hugging Face Spaces.
- Siapapun dapat langsung membuka link dari browser HP atau Laptop untuk memindai sampah dan memetakan laporan!
