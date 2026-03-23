# 🛒 POSweb by Rsby

<div align="center">

![POSweb Banner](https://img.shields.io/badge/POSweb-v2.2-blue?style=for-the-badge&logo=shopping-cart)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-orange?style=for-the-badge&logo=android)
![Security](https://img.shields.io/badge/Security-JWT%20%2B%20Rate%20Limit-red?style=for-the-badge)

**Point of Sale berbasis Web** — ringan, cepat, dan bisa dipakai dari HP maupun komputer.  
Dibangun dengan Node.js + MySQL, tanpa framework berat.

### 🌐 [Lihat Demo Live →](http://server.rsby.cloud:3000/)
> Login demo: **username:** `rsby` | **password:** `1234`

</div>

---

## ✨ Fitur Lengkap

### 🧾 Kasir
- Scan barcode fisik langsung dari input (keyboard emulator scanner)
- Cari produk by nama atau kode secara realtime
- Filter produk berdasarkan kategori
- Pilih metode bayar: **Tunai** atau **QRIS**
- Hitung kembalian otomatis
- Tombol "Uang Pas" untuk bayar tepat
- **Diskon per produk** — produk diskon tampil badge merah + harga coret di katalog
- **Diskon global** — toggle on/off langsung dari keranjang, badge info potongan nominal
- **Pajak / PPN** — kalkulasi otomatis (mode exclude atau include), tampil di keranjang dan struk

### 💬 Struk WhatsApp
- Setelah transaksi, kasir bisa kirim struk ke nomor WA pelanggan
- Input nomor HP pelanggan langsung dari modal
- Nomor WA pelanggan tersimpan ke database untuk histori
- Di HP: langsung buka aplikasi WhatsApp; di PC: buka WhatsApp Web
- Teks struk diformat rapi dengan detail item, diskon, pajak, total, dan ucapan terima kasih

### 🖨️ Cetak & Unduh Struk
- Mendukung printer thermal **58mm** dan **80mm**
- Cetak langsung dari browser, tanpa driver tambahan
- **Unduh PDF Struk** — download langsung tanpa dialog print, bisa dibagikan via WhatsApp/email
- Reprint struk lama dari menu Retur maupun Laporan
- Footer struk bisa dikustomisasi
- Struk menampilkan: logo toko, nama, alamat, jam operasional, diskon per item, diskon global, PPN, total

### 📦 Manajemen Gudang (Inventori)
- Tambah, edit, hapus produk dengan mudah
- Input: barcode, nama, kategori, satuan, harga beli, harga jual, stok, **diskon produk (%)**
- **Auto-generate barcode** urutan angka (001, 002, 003, dst.)
- Kategori otomatis dinormalisasi ke UPPERCASE
- Stok rendah ditandai merah dan berkedip di katalog kasir
- Filter/cari produk di tabel inventori
- Badge diskon tampil di kolom harga jual

### 📊 Laporan Transaksi
- **Laporan Harian**: filter berdasarkan rentang tanggal custom
- **Laporan Bulanan**: akumulasi per bulan
- Tampilkan omzet, modal, **laba bersih (sudah dikurangi PPN)**, dan **total PPN**
- Kolom PPN per transaksi di laporan harian
- Cetak laporan ke PDF dengan summary box lengkap (Omzet, Modal, PPN, Laba Bersih)
- Catatan otomatis total PPN yang harus disetor ke negara
- Pencarian struk berdasarkan nomor transaksi
- Klik "Audit" untuk lihat rincian item + tombol Unduh PDF & Retur

### ↩️ Retur & Reprint
- Tab Retur khusus untuk kasir yang punya akses reprint/retur
- Tampilkan semua transaksi hari ini (bisa ganti tanggal)
- **Reprint langsung** — cetak ulang tanpa buka modal tambahan
- **Unduh PDF** langsung dari tab Retur
- **Retur langsung** — void transaksi + item otomatis masuk ke keranjang kasir

### 👤 Manajemen Pengguna (Multi-user)
- Buat akun kasir/staff sebanyak yang dibutuhkan
- Atur hak akses per menu secara granular:

| Permission | Akses Yang Diberikan |
|---|---|
| `kasir` | Tab kasir (default semua user) |
| `gudang` | Manajemen produk & stok |
| `laporan` | Laporan transaksi + tombol Audit |
| `pengguna` | Manajemen akun user |
| `setting` | Profil toko & pengaturan |
| `reprint` | Cetak ulang struk lama |
| `retur` | Void & retur transaksi |
| `backup` | Backup & restore database |
| `dashboard` | Dashboard statistik (otomatis = super admin) |

- Akun **owner** (super admin) mendapat semua akses secara otomatis
- Tidak bisa hapus akun sendiri atau akun owner

### 📈 Dashboard Statistik
- Omzet & laba hari ini + perbandingan **↑↓ % vs kemarin**
- Jumlah transaksi hari ini
- Total produk (+ info berapa yang sedang promo)
- Total sisa stok (+ info berapa produk stok rendah)
- **⚠️ Notifikasi alert stok hampir habis** — banner merah muncul otomatis dengan daftar produk yang perlu direstok
- **Grafik Perbandingan** — bar chart minggu ini vs minggu lalu per hari, lengkap dengan ringkasan % naik/turun
- Grafik tren omzet 7 hari terakhir
- Grafik 5 barang terlaris
- **Transaksi terakhir hari ini** — 5 transaksi terbaru dengan jam, kasir, metode, dan laba
- Hanya tampil untuk super admin

### ⚙️ Setting Toko
Setting dibagi menjadi sub-tab yang terorganisir:

#### Profil Toko
- Nama toko, alamat, nomor telepon
- **Logo Toko** — upload gambar, tampil di header app dan struk cetak
- **Jam Operasional** — atur per hari (Senin–Minggu), preset cepat Sen–Jum / Sen–Sab / Setiap Hari
- **Tema Warna Aplikasi** — 6 pilihan: Biru, Hijau, Ungu, Merah, Orange, Pink

#### Printer & Struk
- Ukuran kertas: 58mm atau 80mm
- Pesan footer struk
- Disimpan per perangkat/browser

#### Transaksi
- **Prefix Nomor Struk** — ganti `TRX` menjadi kode custom. Preview langsung.
- **Diskon Global** — persentase + toggle aktif/nonaktif
- **Pajak / PPN** — aktif/nonaktif, persentase, mode Exclude atau Include

#### Manajemen Akun
- Tambah/edit/hapus akun kasir dan staff
- Atur hak akses granular per menu

#### Backup & Restore
- **Backup** — unduh seluruh data sebagai file `.json`
- **Restore** — upload file backup, semua data dipulihkan

### 🔐 Keamanan
- **JWT Token** — setiap login menghasilkan token (HMAC-SHA256, expired 12 jam), dikirim di header setiap request API
- **Rate Limiting Login** — maksimal 5 percobaan per IP per 15 menit, anti brute force
- **API Key** — akses API via header `x-api-key` untuk integrasi eksternal, diset via environment variable
- **Auto Logout Idle** — otomatis logout setelah 30 menit tidak ada aktivitas
- **Auth Middleware** — semua endpoint `/api/` terlindungi, hanya `/api/login` dan `/api/setup` yang publik

### 📋 Daftar Pelanggan WA
- Rekap semua pelanggan yang pernah menerima struk via WA
- Dikelompokkan per nomor WA unik
- Tampilkan total transaksi & total belanja per pelanggan
- Tombol Chat WA langsung dari tabel
- **Ekspor ke CSV** untuk keperluan marketing/broadcast

### 📱 Mobile-First
- Responsive penuh — dioptimalkan untuk HP Android
- Katalog kasir 2 kolom di mobile, 3–5 kolom di desktop
- Produk diskon tampil visual berbeda (border hijau, badge merah)
- Sidebar navigasi dengan overlay di mobile
- Input numerik dengan keyboard angka di HP

---

## 🚀 Cara Install

### 🪟 Instalasi di Windows (Lokal)

#### Langkah 1 — Install Node.js
1. Buka [https://nodejs.org](https://nodejs.org)
2. Download versi **LTS** dan jalankan installer
3. Verifikasi:
```cmd
node -v
npm -v
```

#### Langkah 2 — Install MySQL via XAMPP
1. Download XAMPP di [https://www.apachefriends.org](https://www.apachefriends.org)
2. Install, pilih komponen **MySQL** dan **phpMyAdmin**
3. Buka XAMPP Control Panel → klik **Start** di baris MySQL

#### Langkah 3 — Download POSweb
```cmd
git clone https://github.com/monologstorycom-pixel/poin-of-sale-by-rsby.git
cd poin-of-sale-by-rsby
```

#### Langkah 4 — Install & Jalankan
```cmd
npm install
node server.js
```
Muncul pesan: `[POSweb] 🚀 Server aktif di port 3000`

#### Langkah 5 — Setup Pertama Kali
Buka browser → akses `http://localhost:3000` → isi form installer:

| Kolom | Nilai untuk XAMPP |
|---|---|
| Host | `127.0.0.1` |
| Nama Database | `db_posweb` |
| Username DB | `root` |
| Password DB | *(kosongkan)* |
| Nama Toko | Nama toko kamu |
| Username Admin | Bebas |
| Password Admin | Minimal 4 karakter |

---

### 🐧 Instalasi di Linux / VPS

```bash
git clone https://github.com/monologstorycom-pixel/poin-of-sale-by-rsby.git
cd poin-of-sale-by-rsby
npm install
node server.js
```

**Supaya berjalan terus di background (pm2):**
```bash
npm install -g pm2
pm2 start server.js --name posweb
pm2 startup
pm2 save
```

**Dengan environment variable (direkomendasikan untuk production):**
```bash
# Buat file .env
echo "API_KEY=rahasiakamu123" > .env
echo "JWT_SECRET=secretpanjangacak456" >> .env

# Jalankan
API_KEY=rahasiakamu123 JWT_SECRET=secretpanjangacak456 node server.js

# Atau pakai dotenv (install dulu: npm install dotenv)
# Tambah require('dotenv').config() di baris pertama server.js
```

---

### 🐳 Instalasi via Docker

```bash
docker build -t posweb .
docker run -p 3000:3000 -e API_KEY=rahasiakamu123 -e JWT_SECRET=secretpanjang posweb
```

---

## 🔑 Konfigurasi Keamanan

### JWT Token
Token otomatis di-generate saat login, expired dalam **12 jam**. Tidak perlu konfigurasi tambahan — JWT secret di-generate otomatis setiap server restart. Untuk secret yang permanen:
```bash
JWT_SECRET=secretpanjangacakdanaman node server.js
```

### API Key (Opsional)
Untuk akses API dari aplikasi eksternal tanpa login:
```bash
# Set saat jalankan server
API_KEY=rahasiakamu123 node server.js
```

Gunakan di request:
```bash
curl -H "x-api-key: rahasiakamu123" http://localhost:3000/api/produk
```

### Rate Limiting
Sudah aktif secara default — **5 percobaan login** per IP per **15 menit**. Tidak perlu konfigurasi.

### Auto Logout
Default **30 menit** idle. Bisa diubah di `app.js`:
```js
var IDLE_TIMEOUT_MS = 30 * 60 * 1000; // ganti angka 30 sesuai kebutuhan
```

---

## 📁 Struktur Proyek

```
posweb-rsby/
├── server.js              # Backend Express + MySQL + Auth
├── config.json            # Konfigurasi koneksi DB (auto-dibuat saat setup)
├── .env                   # Environment variables (opsional, tidak di-commit)
├── package.json
├── Dockerfile
└── public/
    ├── index.html         # Antarmuka utama (SPA)
    ├── app.js             # Logika frontend (vanilla JS)
    ├── style.css          # Styling custom
    └── setup/
        └── index.html     # Halaman installer
```

---

## 🔌 Endpoint API

Semua endpoint `/api/` memerlukan header **`Authorization: Bearer <token>`** kecuali `/api/login` dan `/api/setup`.  
Alternatif: gunakan header **`x-api-key: <key>`**.

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/setup` | Instalasi awal sistem *(publik)* |
| POST | `/api/login` | Login user, return JWT token *(publik)* |
| GET | `/api/produk` | Daftar semua produk |
| POST | `/api/produk` | Tambah produk baru |
| PUT | `/api/produk/:barcode` | Update produk |
| DELETE | `/api/produk/:barcode` | Hapus produk |
| POST | `/api/transaksi` | Simpan transaksi baru |
| GET | `/api/transaksi` | Daftar semua transaksi |
| GET | `/api/transaksi/detail/:id` | Detail item transaksi |
| DELETE | `/api/transaksi/:id` | Void/hapus transaksi |
| PUT | `/api/transaksi/wa/:id` | Simpan nomor WA pelanggan |
| GET | `/api/pelanggan-wa` | Daftar pelanggan WA |
| GET | `/api/terlaris` | Top 5 barang terlaris |
| GET | `/api/pengaturan` | Ambil setting toko |
| PUT | `/api/pengaturan` | Update setting toko |
| GET | `/api/pengaturan/logo` | Ambil logo toko (base64) |
| PUT | `/api/pengaturan/logo` | Simpan logo toko |
| DELETE | `/api/pengaturan/logo` | Hapus logo toko |
| GET | `/api/pengaturan/jam` | Ambil jam operasional |
| PUT | `/api/pengaturan/jam` | Simpan jam operasional |
| GET | `/api/backup` | Download backup database (.json) |
| POST | `/api/restore` | Restore database dari file backup |
| GET | `/api/users` | Daftar semua user |
| POST | `/api/users` | Tambah user baru |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Hapus user |

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
|---|---|
| **Backend** | Node.js, Express.js, mysql2 |
| **Auth** | JWT custom (HMAC-SHA256, crypto bawaan Node.js) |
| **Frontend** | Vanilla JavaScript (no framework) |
| **CSS** | Tailwind CSS (CDN) |
| **Chart** | Chart.js |
| **PDF** | jsPDF (CDN) |
| **Font** | Plus Jakarta Sans (Google Fonts) |
| **Database** | MySQL / MariaDB |
| **Container** | Docker (opsional) |

---

## 🔐 Ringkasan Keamanan

| Fitur | Status | Keterangan |
|---|---|---|
| JWT Token | ✅ Aktif | Expired 12 jam, HMAC-SHA256 |
| Rate Limiting | ✅ Aktif | 5x per IP per 15 menit |
| API Key | ✅ Opsional | Set via `API_KEY` env var |
| Auto Logout Idle | ✅ Aktif | 30 menit tidak ada aktivitas |
| Auth Middleware | ✅ Aktif | Semua `/api/` terlindungi |
| Password Hashing | ⏳ Roadmap | bcrypt (belum diimplementasi) |
| HTTPS | ⚙️ Manual | Konfigurasi di reverse proxy (nginx) |

---

## 📝 Catatan Pengembangan

- **Migrasi skema DB** berjalan otomatis saat server start — tidak perlu SQL manual
- **JWT** diimplementasikan tanpa library eksternal menggunakan `crypto` bawaan Node.js
- **Logo toko** disimpan sebagai base64 di kolom `MEDIUMTEXT` — endpoint terpisah agar response ringan
- **Jam operasional** disimpan sebagai JSON di database
- **Diskon per produk** disimpan di kolom `diskon` tabel `produk` (persen)
- **PPN** mendukung dua mode: exclude (ditambahkan ke total) dan include (diekstrak dari harga)
- **Prefix struk** menggantikan `TRX-` hardcode, dikonfigurasi per toko
- **Unduh PDF struk** menggunakan jsPDF — ditulis langsung ke PDF tanpa render DOM
- **Tema warna** disimpan di `localStorage` browser — berbeda per perangkat
- **Backup** mencakup semua tabel: produk, transaksi, detail_transaksi, users, pengaturan
- **Dashboard** memuat data sekali dari API lalu kalkulasi semua metrik di frontend

---

## 🤝 Kontribusi

Pull request, issue, dan saran fitur sangat disambut!

1. Fork repositori ini
2. Buat branch: `git checkout -b fitur/nama-fitur`
3. Commit: `git commit -m 'Tambah fitur xyz'`
4. Push: `git push origin fitur/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.

---

<div align="center">

**Dibuat dengan ❤️ oleh [Rsby](https://github.com/monologstorycom-pixel)**

*POSweb v2.2 — Simple. Fast. Secure.*

🌐 **[Demo Live](http://server.rsby.cloud:3000/)** · user: `rsby` | pass: `1234`

</div>
