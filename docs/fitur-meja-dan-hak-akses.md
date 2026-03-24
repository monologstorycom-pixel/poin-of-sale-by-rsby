# Fitur Meja & Hak Akses POS

## 1. Hak Akses Dinamis
- Menu Retur & Cetak Ulang digabung
- Menu muncul berdasarkan permission
- Pajak/PPN muncul jika diaktifkan

## 2. Mode Meja (ON/OFF)
- ON: bayar di akhir
- OFF: langsung bayar

## 3. Flow Meja
- Input pesanan tanpa bayar
- Simpan sebagai UNPAID
- Bayar saat selesai

## 4. Print Dapur
- Auto print saat simpan order

## 5. Monitoring Meja
- Merah: belum bayar
- Hijau: kosong

## 6. Struktur DB
orders, order_items, tables

## 7. Validasi
- Tidak bisa bayar order kosong
- Reset meja setelah bayar

