const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const configPath = path.join(__dirname, 'config.json');
let db; 
let isSystemReady = false; 

// MIDDLEWARE
app.use((req, res, next) => {
    if (req.path === '/api/setup' || (req.path.includes('.') && !req.path.endsWith('.html'))) return next();
    if (isSystemReady) {
        if (req.path.startsWith('/setup')) return res.redirect('/');
        return next(); 
    } else {
        if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Silakan jalankan instalasi terlebih dahulu.' });
        if (!req.path.startsWith('/setup')) return res.redirect('/setup/');
        return next(); 
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// INISIALISASI DATABASE
async function initSystem() {
    try {
        if (!fs.existsSync(configPath)) { isSystemReady = false; return; }
        const rawData = fs.readFileSync(configPath, 'utf8');
        if (!rawData.trim()) { isSystemReady = false; return; }

        const config = JSON.parse(rawData);
        db = mysql.createPool({
            host: config.host, user: config.user, password: config.password, database: config.database,  
            waitForConnections: true, connectionLimit: 10, queueLimit: 0
        });

        const promiseDb = db.promise();
        await promiseDb.query(`CREATE TABLE IF NOT EXISTS produk (id INT AUTO_INCREMENT PRIMARY KEY, barcode VARCHAR(50) UNIQUE, nama VARCHAR(100), harga_jual DECIMAL(10,2), stok INT, harga_beli DECIMAL(10,2) DEFAULT 0, kategori VARCHAR(50) DEFAULT '-', satuan VARCHAR(20) DEFAULT 'pcs')`);
        await promiseDb.query(`CREATE TABLE IF NOT EXISTS transaksi (id INT AUTO_INCREMENT PRIMARY KEY, no_struk VARCHAR(50) UNIQUE, tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total_bayar DECIMAL(10,2), total_modal DECIMAL(10,2) DEFAULT 0, kasir VARCHAR(50) DEFAULT 'Admin', metode_bayar VARCHAR(20) DEFAULT 'Tunai')`);
        await promiseDb.query(`CREATE TABLE IF NOT EXISTS detail_transaksi (id INT AUTO_INCREMENT PRIMARY KEY, id_transaksi INT, barcode VARCHAR(50), nama_barang VARCHAR(100), harga DECIMAL(10,2), qty INT, subtotal DECIMAL(10,2))`);
        await promiseDb.query(`CREATE TABLE IF NOT EXISTS pengaturan (id INT PRIMARY KEY DEFAULT 1, nama_toko VARCHAR(100), alamat_toko TEXT, telp_toko VARCHAR(20))`);
        await promiseDb.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, password VARCHAR(255), role VARCHAR(255))`);

        const alters = [
            `ALTER TABLE transaksi ADD COLUMN total_modal DECIMAL(10,2) DEFAULT 0 AFTER total_bayar`,
            `ALTER TABLE transaksi ADD COLUMN kasir VARCHAR(50) DEFAULT 'Admin' AFTER total_modal`,
            `ALTER TABLE transaksi ADD COLUMN metode_bayar VARCHAR(20) DEFAULT 'Tunai' AFTER kasir`,
            `ALTER TABLE produk ADD COLUMN harga_beli DECIMAL(10,2) DEFAULT 0 AFTER harga_jual`,
            `ALTER TABLE produk ADD COLUMN kategori VARCHAR(50) DEFAULT '-' AFTER stok`,
            `ALTER TABLE produk ADD COLUMN satuan VARCHAR(20) DEFAULT 'pcs' AFTER kategori`,
            `ALTER TABLE users MODIFY COLUMN role VARCHAR(255)`
        ];
        for (let q of alters) { try { await promiseDb.query(q); } catch(e) {} }

        isSystemReady = true; 
        console.log(`[POSweb] Berhasil terhubung ke database: ${config.database}`);
    } catch (err) {
        console.error("[POSweb ERROR] Gagal inisialisasi:", err.message);
        isSystemReady = false; 
    }
}
initSystem();

// API SETUP & LOGIN
app.post('/api/setup', async (req, res) => {
    if (isSystemReady) return res.status(400).json({ success: false, pesan: 'Sistem sudah terinstal!' });
    let { dbHost, dbUser, dbPass, dbName, tokoNama, tokoAlamat, tokoTelp, ownerUser, ownerPass } = req.body;
    ownerUser = (ownerUser || '').trim(); ownerPass = (ownerPass || '').trim();

    const tempDb = mysql.createConnection({ host: dbHost, user: dbUser, password: dbPass });
    tempDb.connect((err) => {
        if (err) return res.status(400).json({ success: false, pesan: 'Koneksi MySQL Ditolak!' });
        tempDb.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, async (err2) => {
            if (err2) { tempDb.end(); return res.status(500).json({ success: false, pesan: 'Gagal membuat database.' }); }
            tempDb.end(); 
            const configData = { host: dbHost, user: dbUser, password: dbPass, database: dbName };
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 4));
            await initSystem();
            try {
                const promiseDb = db.promise();
                const roleAll = 'dashboard,kasir,gudang,laporan,pengguna,setting';
                await promiseDb.query(`INSERT INTO users (username, password, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password=?, role=?`, [ownerUser, ownerPass, roleAll, ownerPass, roleAll]);
                await promiseDb.query(`INSERT INTO pengaturan (id, nama_toko, alamat_toko, telp_toko) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE nama_toko=?, alamat_toko=?, telp_toko=?`, [tokoNama, tokoAlamat || '', tokoTelp || '', tokoNama, tokoAlamat || '', tokoTelp || '']);
                res.json({ success: true, pesan: 'Instalasi Berhasil!' });
            } catch (err3) { res.status(500).json({ success: false, pesan: 'Gagal menyimpan data.' }); }
        });
    });
});

app.post('/api/login', (req, res) => {
    const username = (req.body.username || '').trim(); const password = (req.body.password || '').trim();
    if (!db) return res.status(500).send({ success: false, pesan: 'Database Error' });
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).send({ success: false, pesan: 'Database Error' });
        if (results && results.length > 0 && results[0].password === password) {
            res.send({ success: true, role: results[0].role, username: results[0].username });
        } else { res.status(401).send({ success: false, pesan: 'Username/Password Salah!' }); }
    });
});

// API TRANSAKSI & PRODUK
app.get('/api/produk', (req, res) => db.query('SELECT * FROM produk ORDER BY nama ASC', (err, results) => res.json(results || [])));

app.post('/api/produk', (req, res) => {
    let { barcode, nama, harga_jual, harga_beli, stok, kategori, satuan } = req.body;
    harga_jual = parseFloat(harga_jual) || 0; harga_beli = parseFloat(harga_beli) || 0; stok = parseInt(stok) || 0;
    db.query('INSERT INTO produk (barcode, nama, harga_jual, harga_beli, stok, kategori, satuan) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE stok = stok + ?, harga_jual = ?, harga_beli = ?, kategori = ?, satuan = ?', 
    [barcode, nama, harga_jual, harga_beli, stok, kategori||'-', satuan||'pcs', stok, harga_jual, harga_beli, kategori||'-', satuan||'pcs'], (err) => {
        if(err) return res.status(500).json({ success: false, pesan: err.message });
        res.json({ success: true });
    });
});

app.put('/api/produk/:barcode', (req, res) => {
    let { nama, harga_jual, harga_beli, stok, kategori, satuan } = req.body;
    harga_jual = parseFloat(harga_jual) || 0; harga_beli = parseFloat(harga_beli) || 0; stok = parseInt(stok) || 0;
    db.query('UPDATE produk SET nama = ?, harga_jual = ?, harga_beli = ?, stok = ?, kategori = ?, satuan = ? WHERE barcode = ?', 
    [nama, harga_jual, harga_beli, stok, kategori||'-', satuan||'pcs', req.params.barcode], (err) => {
        if(err) return res.status(500).json({ success: false, pesan: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/produk/:barcode', (req, res) => db.query('DELETE FROM produk WHERE barcode = ?', [req.params.barcode], () => res.json({ success: true })));

app.post('/api/transaksi', (req, res) => {
    let { no_struk, total_bayar, total_modal, keranjang, kasir, metode_bayar } = req.body;
    total_bayar = parseFloat(total_bayar) || 0; total_modal = parseFloat(total_modal) || 0;
    db.query('INSERT INTO transaksi (no_struk, total_bayar, total_modal, kasir, metode_bayar) VALUES (?, ?, ?, ?, ?)', [no_struk, total_bayar, total_modal, kasir || 'Admin', metode_bayar || 'Tunai'], (err, result) => {
        if (err) return res.status(500).json({ success: false, pesan: err.message });
        const id_tx = result.insertId;
        const values = keranjang.map(i => [id_tx, i.barcode, i.nama, parseFloat(i.harga_jual)||0, parseInt(i.qty)||0, parseFloat(i.subtotal)||0]);
        db.query('INSERT INTO detail_transaksi (id_transaksi, barcode, nama_barang, harga, qty, subtotal) VALUES ?', [values], () => {
            keranjang.forEach(i => db.query('UPDATE produk SET stok = stok - ? WHERE barcode = ?', [parseInt(i.qty)||0, i.barcode]));
            res.json({ success: true, id_transaksi: id_tx });
        });
    });
});

app.get('/api/transaksi', (req, res) => db.query('SELECT * FROM transaksi ORDER BY id DESC', (err, results) => res.json(results || [])));
app.get('/api/transaksi/detail/:id', (req, res) => db.query('SELECT * FROM detail_transaksi WHERE id_transaksi = ?', [req.params.id], (err, results) => res.json(results || [])));
app.delete('/api/transaksi/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT barcode, qty FROM detail_transaksi WHERE id_transaksi = ?', [id], (err, items) => {
        if (items && items.length > 0) items.forEach(i => db.query('UPDATE produk SET stok = stok + ? WHERE barcode = ?', [parseInt(i.qty)||0, i.barcode]));
        db.query('DELETE FROM detail_transaksi WHERE id_transaksi = ?', [id], () => db.query('DELETE FROM transaksi WHERE id = ?', [id], () => res.json({ success: true })));
    });
});
app.get('/api/terlaris', (req, res) => db.query('SELECT nama_barang, SUM(qty) as total_qty FROM detail_transaksi GROUP BY barcode, nama_barang ORDER BY total_qty DESC LIMIT 5', (err, results) => res.json(results || [])));

// API PENGGUNA & PENGATURAN
app.get('/api/users', (req, res) => db.query('SELECT id, username, role FROM users', (err, results) => res.json(results || [])));
app.post('/api/users', (req, res) => db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [req.body.username, req.body.password, req.body.role], (err) => res.json({ success: !err })));
app.put('/api/users/:id', (req, res) => { if (req.body.password) db.query('UPDATE users SET password=?, role=? WHERE id=?', [req.body.password, req.body.role, req.params.id], () => res.json({success:true})); else db.query('UPDATE users SET role=? WHERE id=?', [req.body.role, req.params.id], () => res.json({success:true})); });
app.delete('/api/users/:id', (req, res) => db.query('DELETE FROM users WHERE id = ?', [req.params.id], () => res.json({ success: true })));
app.get('/api/pengaturan', (req, res) => db.query('SELECT * FROM pengaturan WHERE id = 1', (err, results) => res.json(results ? results[0] : {})));
app.put('/api/pengaturan', (req, res) => db.query('UPDATE pengaturan SET nama_toko=?, alamat_toko=?, telp_toko=? WHERE id=1', [req.body.nama_toko, req.body.alamat_toko, req.body.telp_toko], () => res.json({success:true})));

app.listen(3000, () => console.log('POSweb by Rsby Server Aktif!'));
