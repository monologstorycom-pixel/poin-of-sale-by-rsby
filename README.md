# 🛒 POSweb by Rsby — v1

> **Point of Sale berbasis Web** yang ringan, cepat, dan bisa dipakai dari HP maupun komputer. Dibangun dengan Node.js + MySQL, tanpa framework berat.

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|-------|-----------|
| 🧾 **Kasir** | Scan barcode, pilih produk, proses pembayaran Tunai / QRIS |
| 💬 **Kirim Struk via WhatsApp** | Struk otomatis dikirim ke nomor WA pelanggan, langsung buka app WA di HP |
| 🖨️ **Cetak Struk** | Mendukung printer thermal 58mm dan 80mm |
| 📦 **Manajemen Gudang** | Tambah, edit, hapus produk — auto-generate barcode urutan |
| 📊 **Laporan** | Laporan harian (filter tanggal) & bulanan, lengkap omzet, modal, laba |
| ↩️ **Retur & Reprint** | Void transaksi, stok otomatis kembali, item masuk keranjang kasir |
| 👤 **Manajemen User** | Multi-user dengan hak akses per menu (Kasir, Gudang, Laporan, dll.) |
| 📈 **Dashboard** | Grafik omzet 7 hari, 5 barang terlaris, statistik real-time |
| ⚙️ **Setting Toko** | Nama toko, alamat, telepon tampil di struk |
| 📱 **Mobile-first** | Responsive penuh — dioptimalkan untuk HP Android |

---

## 🚀 Cara Install

### Prasyarat
- **Node.js** v16 atau lebih baru
- **MySQL** 5.7 / 8.x (atau MariaDB)
- **npm**

### Langkah Instalasi

**1. Clone repositori**
```bash
git clone https://github.com/monologstorycom-pixel/posweb-rsby.git
cd posweb-rsby
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
- Nama toko
- Username & password admin pertama

> ✅ Setelah instalasi selesai, sistem langsung siap dipakai!

---

## 🐳 Instalasi via Docker

```bash
# Build image
docker build -t posweb .

# Jalankan container
docker run -p 3000:3000 posweb
```

> **Catatan:** Pastikan `config.json` sudah diisi dengan host MySQL yang bisa diakses dari dalam container (bukan `localhost` — gunakan IP LAN atau hostname).

---

## 🔑 Login Default

Setelah instalasi, login menggunakan akun yang dibuat saat setup.

Untuk akun **owner** (super admin), semua menu terbuka otomatis.

---

## 📁 Struktur Proyek

```
posweb-rsby/
├── server.js          # Backend Express + MySQL
├── config.json        # Konfigurasi koneksi DB (auto-dibuat saat setup)
├── package.json
├── Dockerfile
└── public/
    ├── index.html     # Antarmuka utama (SPA)
    ├── app.js         # Logika frontend
    ├── style.css      # Styling custom
    └── setup/
        └── index.html # Halaman installer
```

---

## 🔐 Sistem Hak Akses

Setiap user bisa diberi akses ke menu tertentu:

| Permission | Keterangan |
|-----------|-----------|
| `kasir` | Akses tab Kasir (default untuk semua) |
| `gudang` | Manajemen produk & stok |
| `laporan` | Laporan transaksi + fitur Audit |
| `pengguna` | Manajemen akun user |
| `setting` | Pengaturan profil toko & printer |
| `reprint` | Cetak ulang struk lama |
| `retur` | Void & retur transaksi |
| `dashboard` | Dashboard statistik (otomatis = super admin) |

---

## 🛠️ Stack Teknologi

- **Backend:** Node.js, Express.js, mysql2
- **Frontend:** Vanilla JavaScript, Tailwind CSS (CDN), Chart.js
- **Database:** MySQL / MariaDB
- **Container:** Docker (opsional)

---

## 📱 Screenshot

> Tampilan berjalan di browser HP maupun desktop — tidak perlu install aplikasi.

---

## 📝 Catatan Pengembangan

- Struk WA menggunakan `wa.me` — di HP langsung buka app WhatsApp, di PC buka WhatsApp Web
- Nomor WA pelanggan tersimpan ke DB di kolom `wa_pelanggan` untuk histori
- Barcode produk di-generate otomatis urut (`001`, `002`, dst.) saat tambah produk baru
- Semua kategori produk dinormalisasi ke UPPERCASE otomatis
- Migrasi kolom DB berjalan otomatis saat server pertama kali dijalankan

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.

---

<div align="center">

**Dibuat dengan ❤️ oleh Rsby**

*POSweb v1 — Simple. Fast. Works offline.*

</div>
