# 🛒 POSweb by Rsby

<div align="center">

![POSweb Banner](https://img.shields.io/badge/POSweb-v1.0-blue?style=for-the-badge&logo=shopping-cart)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-orange?style=for-the-badge&logo=android)

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

### 💬 Struk WhatsApp
- Setelah transaksi, kasir bisa kirim struk ke nomor WA pelanggan
- Input nomor HP pelanggan langsung dari modal — tidak perlu disimpan dulu
- Nomor WA pelanggan tersimpan ke database untuk histori
- Di HP: langsung buka aplikasi WhatsApp; di PC: buka WhatsApp Web
- Teks struk sudah diformat rapi dengan detail item, total, dan ucapan terima kasih

### 🖨️ Cetak Struk Thermal
- Mendukung printer thermal **58mm** dan **80mm**
- Cetak langsung dari browser, tanpa driver tambahan
- Reprint struk lama kapan saja dari menu Retur/Laporan
- Footer struk bisa dikustomisasi (misal: "Barang tidak dapat ditukar")

### 📦 Manajemen Gudang (Inventori)
- Tambah, edit, hapus produk dengan mudah
- Input: barcode, nama, kategori, satuan, harga beli, harga jual, stok
- **Auto-generate barcode** urutan angka (001, 002, 003, dst.)
- Kategori otomatis dinormalisasi ke UPPERCASE
- Stok rendah (≤ 5) ditandai merah dan berkedip sebagai peringatan
- Filter/cari produk di tabel inventori

### 📊 Laporan Transaksi
- **Laporan Harian**: filter berdasarkan rentang tanggal custom
- **Laporan Bulanan**: akumulasi per bulan
- Tampilkan omzet, modal, dan laba bersih
- Cetak laporan ke PDF (print browser)
- Pencarian struk berdasarkan nomor transaksi
- Klik "Audit" pada setiap transaksi untuk lihat rincian item

### ↩️ Retur & Reprint
- **Tab Retur** khusus untuk kasir yang punya akses reprint/retur
- Tampilkan semua transaksi hari ini (bisa ganti tanggal)
- **Reprint langsung** — cetak ulang tanpa buka modal tambahan
- **Retur langsung** — void transaksi + item otomatis masuk ke keranjang kasir
- Kasir tinggal tambah/kurangi item lalu bayar ulang

### 👤 Manajemen Pengguna (Multi-user)
- Buat akun kasir/staff sebanyak yang dibutuhkan
- Atur hak akses per menu secara granular:

| Permission | Akses Yang Diberikan |
|---|---|
| `kasir` | Tab kasir (default semua user) |
| `gudang` | Manajemen produk & stok |
| `laporan` | Laporan transaksi + tombol Audit |
| `pengguna` | Manajemen akun user |
| `setting` | Profil toko & pengaturan printer |
| `reprint` | Cetak ulang struk lama |
| `retur` | Void & retur transaksi |
| `dashboard` | Dashboard statistik (otomatis = super admin) |

- Akun **owner** (super admin) mendapat semua akses secara otomatis
- Tidak bisa hapus akun sendiri atau akun owner

### 📈 Dashboard Statistik
- Omzet & laba hari ini (realtime)
- Total produk & sisa stok
- Grafik tren omzet 7 hari terakhir (Chart.js)
- Grafik 5 barang terlaris
- Hanya tampil untuk super admin

### ⚙️ Setting Toko
- Nama toko, alamat, nomor telepon
- Muncul di header aplikasi dan di struk cetak
- Pilih ukuran kertas printer (58mm / 80mm)
- Kustomisasi pesan footer struk

### 📋 Daftar Pelanggan WA
- Rekap semua pelanggan yang pernah menerima struk via WA
- Dikelompokkan per nomor WA unik
- Tampilkan total transaksi & total belanja per pelanggan
- Tombol Chat WA langsung dari tabel
- **Ekspor ke CSV** untuk keperluan marketing/broadcast

### 📱 Mobile-First
- Responsive penuh — dioptimalkan untuk HP Android
- Sidebar navigasi dengan overlay di mobile
- Input numerik dengan keyboard angka di HP
- Layout kasir menyesuaikan layar kecil/besar

---

## 🚀 Cara Install

### Prasyarat
- **Node.js** v16 atau lebih baru
- **MySQL** 5.7 / 8.x (atau MariaDB)
- **npm**

### Langkah Instalasi

**1. Clone repositori**
```bash
git clone https://github.com/monologstorycom-pixel/poin-of-sale-by-rsby.git
cd poin-of-sale-by-rsby
```

**2. Install dependencies**
```bash
npm install
```

**3. Jalankan server**
```bash
node server.js
```

**4. Buka browser dan akses installer**
```
http://localhost:3000
```

**5. Isi form instalasi:**
- Host & kredensial MySQL
- Nama database (akan dibuat otomatis jika belum ada)
- Nama toko, alamat, nomor telepon
- Username & password admin pertama

> ✅ Setelah instalasi selesai, sistem langsung siap digunakan!

---

## 🐳 Instalasi via Docker

```bash
# Build image
docker build -t posweb .

# Jalankan container
docker run -p 3000:3000 posweb
```

> **Catatan:** Pastikan `config.json` sudah diisi dengan host MySQL yang bisa diakses dari dalam container. Gunakan IP LAN atau hostname — **bukan** `localhost`.

---

## 📁 Struktur Proyek

```
posweb-rsby/
├── server.js              # Backend Express + MySQL (semua API)
├── config.json            # Konfigurasi koneksi DB (auto-dibuat saat setup)
├── package.json
├── Dockerfile
└── public/
    ├── index.html         # Antarmuka utama (SPA)
    ├── app.js             # Logika frontend (vanilla JS)
    ├── style.css          # Styling custom
    └── setup/
        └── index.html     # Halaman installer (wizard setup)
```

---

## 🔌 Endpoint API

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/setup` | Instalasi awal sistem |
| POST | `/api/login` | Login user |
| GET | `/api/produk` | Daftar semua produk |
| POST | `/api/produk` | Tambah produk baru |
| PUT | `/api/produk/:barcode` | Update produk |
| DELETE | `/api/produk/:barcode` | Hapus produk |
| POST | `/api/transaksi` | Simpan transaksi baru |
| GET | `/api/transaksi` | Daftar semua transaksi |
| GET | `/api/transaksi/detail/:id` | Detail item transaksi |
| DELETE | `/api/transaksi/:id` | Void/hapus transaksi (stok dikembalikan) |
| PUT | `/api/transaksi/wa/:id` | Simpan nomor WA pelanggan |
| GET | `/api/pelanggan-wa` | Daftar pelanggan yang punya WA |
| GET | `/api/terlaris` | Top 5 barang terlaris |
| GET | `/api/pengaturan` | Ambil setting toko |
| PUT | `/api/pengaturan` | Update setting toko |
| GET | `/api/users` | Daftar semua user |
| POST | `/api/users` | Tambah user baru |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Hapus user |

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
|---|---|
| **Backend** | Node.js, Express.js, mysql2 |
| **Frontend** | Vanilla JavaScript (no framework) |
| **CSS** | Tailwind CSS (CDN) |
| **Chart** | Chart.js |
| **Font** | Plus Jakarta Sans (Google Fonts) |
| **Database** | MySQL / MariaDB |
| **Container** | Docker (opsional) |

---

## 🔐 Keamanan

- Password disimpan as-is di database — **disarankan untuk menambahkan hashing (bcrypt) di production**
- Sistem hak akses berbasis permission string per user
- XSS protection dasar via `safeStr()` dan `safeAttr()` di frontend
- Endpoint API tidak memerlukan token JWT — cocok untuk jaringan lokal/LAN
- Untuk deployment publik, **tambahkan layer autentikasi token**

---

## 📝 Catatan Pengembangan

- **Struk WA** menggunakan `wa.me` — di HP langsung buka WhatsApp, di PC buka WhatsApp Web
- **Barcode auto-generate** urut numerik (001, 002, dst.) berdasarkan barcode terbesar yang sudah ada
- **Kategori produk** dinormalisasi ke UPPERCASE otomatis di frontend dan backend
- **Migrasi skema DB** berjalan otomatis saat server pertama kali dijalankan — tidak perlu jalankan SQL manual
- **Retur transaksi** menyebabkan stok produk dikembalikan via `DELETE /api/transaksi/:id`
- **Pengaturan printer** (ukuran kertas, footer) disimpan di `localStorage` browser — berbeda per device

---

## 🤝 Kontribusi

Pull request, issue, dan saran fitur sangat disambut!

1. Fork repositori ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m 'Tambah fitur xyz'`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.

---

<div align="center">

**Dibuat dengan ❤️ oleh [Rsby](https://github.com/monologstorycom-pixel)**

*POSweb v1 — Simple. Fast. Works.*

🌐 **[Demo Live](http://server.rsby.cloud:3000/)** · user: `rsby` | pass: `1234`

</div>
