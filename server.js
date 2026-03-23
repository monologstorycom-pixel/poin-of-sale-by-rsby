const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const configPath = path.join(__dirname, 'config.json');
let db;
let isSystemReady = false;

// MIDDLEWARE PENJAGA PINTU
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

        const p = db.promise();
        await p.query(`CREATE TABLE IF NOT EXISTS produk (id INT AUTO_INCREMENT PRIMARY KEY, barcode VARCHAR(50) UNIQUE, nama VARCHAR(100), harga_jual DECIMAL(10,2), stok INT, harga_beli DECIMAL(10,2) DEFAULT 0, kategori VARCHAR(50) DEFAULT '-', satuan VARCHAR(20) DEFAULT 'pcs')`);
        await p.query(`CREATE TABLE IF NOT EXISTS transaksi (id INT AUTO_INCREMENT PRIMARY KEY, no_struk VARCHAR(50) UNIQUE, tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total_bayar DECIMAL(10,2), total_modal DECIMAL(10,2) DEFAULT 0, kasir VARCHAR(50) DEFAULT 'Admin', metode_bayar VARCHAR(20) DEFAULT 'Tunai')`);
        await p.query(`CREATE TABLE IF NOT EXISTS detail_transaksi (id INT AUTO_INCREMENT PRIMARY KEY, id_transaksi INT, barcode VARCHAR(50), nama_barang VARCHAR(100), harga DECIMAL(10,2), qty INT, subtotal DECIMAL(10,2))`);
        await p.query(`CREATE TABLE IF NOT EXISTS pengaturan (id INT PRIMARY KEY DEFAULT 1, nama_toko VARCHAR(100), alamat_toko TEXT, telp_toko VARCHAR(20))`);
        await p.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, password VARCHAR(255), role VARCHAR(255))`);

        const alters = [
            `ALTER TABLE transaksi ADD COLUMN total_modal DECIMAL(10,2) DEFAULT 0 AFTER total_bayar`,
            `ALTER TABLE transaksi ADD COLUMN kasir VARCHAR(50) DEFAULT 'Admin' AFTER total_modal`,
            `ALTER TABLE transaksi ADD COLUMN metode_bayar VARCHAR(20) DEFAULT 'Tunai' AFTER kasir`,
            `ALTER TABLE produk ADD COLUMN harga_beli DECIMAL(10,2) DEFAULT 0 AFTER harga_jual`,
            `ALTER TABLE produk ADD COLUMN kategori VARCHAR(50) DEFAULT '-' AFTER stok`,
            `ALTER TABLE produk ADD COLUMN satuan VARCHAR(20) DEFAULT 'pcs' AFTER kategori`,
            `ALTER TABLE users MODIFY COLUMN role VARCHAR(255)`
        ];
        for (let q of alters) { try { await p.query(q); } catch(e) {} }

        try { await p.query('UPDATE produk SET kategori = UPPER(kategori) WHERE kategori != UPPER(kategori)'); } catch(e) {}
        try { await p.query('ALTER TABLE pengaturan ADD COLUMN logo_toko MEDIUMTEXT DEFAULT NULL'); } catch(e) {}
        try { await p.query("ALTER TABLE pengaturan ADD COLUMN jam_operasional TEXT DEFAULT NULL"); } catch(e) {}
        try { await p.query('ALTER TABLE transaksi ADD COLUMN wa_pelanggan VARCHAR(20) DEFAULT NULL AFTER metode_bayar'); } catch(e) {}

        isSystemReady = true;
        console.log(`[POSweb] Terhubung ke database: ${config.database}`);
    } catch (err) {
        console.error('[POSweb ERROR] Gagal inisialisasi:', err.message);
        isSystemReady = false;
    }
}
initSystem();

// ─── SETUP ────────────────────────────────────────────────
app.post('/api/setup', async (req, res) => {
    if (isSystemReady) return res.status(400).json({ success: false, pesan: 'Sistem sudah terinstal!' });
    let { dbHost, dbUser, dbPass, dbName, tokoNama, tokoAlamat, tokoTelp, ownerUser, ownerPass } = req.body;
    ownerUser = (ownerUser || '').trim(); ownerPass = (ownerPass || '').trim();
    if (!tokoNama || !ownerUser || !ownerPass) return res.status(400).json({ success: false, pesan: 'Nama Toko, Username, dan Password wajib diisi!' });

    const tempDb = mysql.createConnection({ host: dbHost, user: dbUser, password: dbPass });
    tempDb.connect((err) => {
        if (err) return res.status(400).json({ success: false, pesan: 'Koneksi MySQL Ditolak!' });
        tempDb.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, async (err2) => {
            if (err2) { tempDb.end(); return res.status(500).json({ success: false, pesan: 'Gagal membuat database.' }); }
            tempDb.end();
            fs.writeFileSync(configPath, JSON.stringify({ host: dbHost, user: dbUser, password: dbPass, database: dbName }, null, 4));
            await initSystem();
            try {
                const p = db.promise();
                const roleAll = 'dashboard,kasir,gudang,laporan,pengguna,setting,reprint,retur,backup';
                await p.query(`INSERT INTO users (username,password,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE password=?,role=?`, [ownerUser, ownerPass, roleAll, ownerPass, roleAll]);
                await p.query(`INSERT INTO pengaturan (id,nama_toko,alamat_toko,telp_toko) VALUES (1,?,?,?) ON DUPLICATE KEY UPDATE nama_toko=?,alamat_toko=?,telp_toko=?`, [tokoNama, tokoAlamat||'', tokoTelp||'', tokoNama, tokoAlamat||'', tokoTelp||'']);
                console.log(`[POSweb] Setup selesai → User: ${ownerUser}`);
                res.json({ success: true, pesan: 'Instalasi Berhasil!' });
            } catch (err3) { res.status(500).json({ success: false, pesan: 'Gagal menyimpan data: ' + err3.message }); }
        });
    });
});

// ─── LOGIN ─────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();
    if (!db) return res.status(500).json({ success: false, pesan: 'Database Error' });
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ success: false, pesan: 'Database Error' });
        if (results && results.length > 0 && results[0].password === password) {
            console.log(`[Auth] Login: ${username}`);
            res.json({ success: true, role: results[0].role, username: results[0].username });
        } else {
            console.log(`[Auth] Gagal login: ${username}`);
            res.status(401).json({ success: false, pesan: 'Username/Password Salah!' });
        }
    });
});

// ─── USERS ─────────────────────────────────────────────────
app.get('/api/users', (req, res) =>
    db.query('SELECT id, username, role FROM users ORDER BY id ASC', (err, results) => res.json(results || [])));

app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role || 'kasir'], (err) => {
        if (err) return res.status(500).json({ success: false, pesan: 'Username sudah digunakan atau terjadi error.' });
        res.json({ success: true });
    });
});

app.put('/api/users/:id', (req, res) => {
    const { password, role } = req.body;
    if (password) db.query('UPDATE users SET password=?, role=? WHERE id=?', [password, role, req.params.id], (err) => res.json({ success: !err }));
    else          db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id], (err) => res.json({ success: !err }));
});

app.delete('/api/users/:id', (req, res) =>
    db.query('DELETE FROM users WHERE id=?', [req.params.id], () => res.json({ success: true })));

// ─── PENGATURAN ────────────────────────────────────────────
app.get('/api/pengaturan', (req, res) =>
    db.query('SELECT id, nama_toko, alamat_toko, telp_toko FROM pengaturan WHERE id=1', (err, results) => res.json(results ? results[0] : {})));

// Logo terpisah — base64 bisa besar, jangan ikut response pengaturan utama
app.get('/api/pengaturan/logo', (req, res) =>
    db.query('SELECT logo_toko FROM pengaturan WHERE id=1', (err, results) => {
        if (err || !results || !results[0]) return res.json({ logo_toko: null });
        res.json({ logo_toko: results[0].logo_toko || null });
    }));

app.put('/api/pengaturan/logo', (req, res) => {
    const { logo_toko } = req.body;
    db.query(
        'INSERT INTO pengaturan (id, logo_toko) VALUES (1, ?) ON DUPLICATE KEY UPDATE logo_toko=?',
        [logo_toko, logo_toko],
        (err) => {
            if (err) return res.status(500).json({ success: false, pesan: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/pengaturan/logo', (req, res) =>
    db.query('UPDATE pengaturan SET logo_toko=NULL WHERE id=1', () => res.json({ success: true })));

// ─── JAM OPERASIONAL ──────────────────────────────────────
app.get('/api/pengaturan/jam', (req, res) =>
    db.query('SELECT jam_operasional FROM pengaturan WHERE id=1', (err, results) => {
        if (err || !results || !results[0]) return res.json({ jam_operasional: null });
        res.json({ jam_operasional: results[0].jam_operasional || null });
    }));

app.put('/api/pengaturan/jam', (req, res) => {
    const { jam_operasional } = req.body;
    const jamStr = typeof jam_operasional === 'string' ? jam_operasional : JSON.stringify(jam_operasional);
    db.query(
        'INSERT INTO pengaturan (id, jam_operasional) VALUES (1, ?) ON DUPLICATE KEY UPDATE jam_operasional=?',
        [jamStr, jamStr],
        (err) => {
            if (err) return res.status(500).json({ success: false, pesan: err.message });
            res.json({ success: true });
        }
    );
});

app.put('/api/pengaturan', (req, res) => {
    const { nama_toko, alamat_toko, telp_toko } = req.body;
    db.query(
        'INSERT INTO pengaturan (id,nama_toko,alamat_toko,telp_toko) VALUES (1,?,?,?) ON DUPLICATE KEY UPDATE nama_toko=?,alamat_toko=?,telp_toko=?',
        [nama_toko, alamat_toko, telp_toko, nama_toko, alamat_toko, telp_toko],
        () => res.json({ success: true })
    );
});

// ─── PRODUK ────────────────────────────────────────────────
app.get('/api/produk', (req, res) =>
    db.query('SELECT * FROM produk ORDER BY nama ASC', (err, results) => res.json(results || [])));

app.post('/api/produk', (req, res) => {
    let { barcode, nama, harga_jual, harga_beli, stok, kategori, satuan } = req.body;
    harga_jual = parseFloat(harga_jual)||0; harga_beli = parseFloat(harga_beli)||0; stok = parseInt(stok)||0;
    const kat = (kategori||'-').toUpperCase();
    db.query(
        `INSERT INTO produk (barcode,nama,harga_jual,harga_beli,stok,kategori,satuan)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE stok=stok+?, harga_jual=?, harga_beli=?, kategori=?, satuan=?`,
        [barcode, nama, harga_jual, harga_beli, stok, kat, satuan||'pcs',
         stok, harga_jual, harga_beli, kat, satuan||'pcs'],
        (err) => {
            if (err) return res.status(500).json({ success: false, pesan: err.message });
            res.json({ success: true });
        }
    );
});

app.put('/api/produk/:barcode', (req, res) => {
    let { nama, harga_jual, harga_beli, stok, kategori, satuan } = req.body;
    harga_jual = parseFloat(harga_jual)||0; harga_beli = parseFloat(harga_beli)||0; stok = parseInt(stok)||0;
    const katUp = (kategori||'-').toUpperCase();
    db.query(
        'UPDATE produk SET nama=?,harga_jual=?,harga_beli=?,stok=?,kategori=?,satuan=? WHERE barcode=?',
        [nama, harga_jual, harga_beli, stok, katUp, satuan||'pcs', req.params.barcode],
        (err) => {
            if (err) return res.status(500).json({ success: false, pesan: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/produk/:barcode', (req, res) =>
    db.query('DELETE FROM produk WHERE barcode=?', [req.params.barcode], () => res.json({ success: true })));

// ─── TRANSAKSI ─────────────────────────────────────────────
app.post('/api/transaksi', (req, res) => {
    let { no_struk, total_bayar, total_modal, keranjang, kasir, metode_bayar } = req.body;
    total_bayar = parseFloat(total_bayar)||0; total_modal = parseFloat(total_modal)||0;
    db.query(
        'INSERT INTO transaksi (no_struk,total_bayar,total_modal,kasir,metode_bayar) VALUES (?,?,?,?,?)',
        [no_struk, total_bayar, total_modal, kasir||'Admin', metode_bayar||'Tunai'],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, pesan: err.message });
            const id_tx = result.insertId;
            const values = keranjang.map(i => [id_tx, i.barcode, i.nama, parseFloat(i.harga_jual)||0, parseInt(i.qty)||0, parseFloat(i.subtotal)||0]);
            db.query('INSERT INTO detail_transaksi (id_transaksi,barcode,nama_barang,harga,qty,subtotal) VALUES ?', [values], () => {
                keranjang.forEach(i => db.query('UPDATE produk SET stok=stok-? WHERE barcode=?', [parseInt(i.qty)||0, i.barcode]));
                res.json({ success: true, id_transaksi: id_tx });
            });
        }
    );
});

app.get('/api/transaksi', (req, res) =>
    db.query('SELECT * FROM transaksi ORDER BY id DESC', (err, results) => res.json(results || [])));

app.get('/api/transaksi/detail/:id', (req, res) =>
    db.query('SELECT * FROM detail_transaksi WHERE id_transaksi=?', [req.params.id], (err, results) => res.json(results || [])));

app.delete('/api/transaksi/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT barcode, qty FROM detail_transaksi WHERE id_transaksi=?', [id], (err, items) => {
        if (items && items.length > 0) items.forEach(i => db.query('UPDATE produk SET stok=stok+? WHERE barcode=?', [parseInt(i.qty)||0, i.barcode]));
        db.query('DELETE FROM detail_transaksi WHERE id_transaksi=?', [id], () => {
            db.query('DELETE FROM transaksi WHERE id=?', [id], () => res.json({ success: true }));
        });
    });
});

app.put('/api/transaksi/wa/:id', (req, res) => {
    const { wa_pelanggan } = req.body;
    if (!wa_pelanggan) return res.status(400).json({ success: false, pesan: 'Nomor WA wajib diisi.' });
    db.query('UPDATE transaksi SET wa_pelanggan=? WHERE id=?', [wa_pelanggan, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, pesan: err.message });
        res.json({ success: true });
    });
});

app.get('/api/pelanggan-wa', (req, res) => {
    db.query(
        `SELECT t.id, t.no_struk, t.tanggal, t.total_bayar, t.kasir, t.metode_bayar, t.wa_pelanggan
         FROM transaksi t
         WHERE t.wa_pelanggan IS NOT NULL AND t.wa_pelanggan != ''
         ORDER BY t.tanggal DESC`,
        (err, results) => res.json(results || [])
    );
});

app.get('/api/terlaris', (req, res) =>
    db.query('SELECT nama_barang, SUM(qty) as total_qty FROM detail_transaksi GROUP BY barcode,nama_barang ORDER BY total_qty DESC LIMIT 5', (err, results) => res.json(results || [])));

// ─── BACKUP DATABASE ───────────────────────────────────────
app.get('/api/backup', async (req, res) => {
    try {
        const p = db.promise();
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const backup = {
            meta: {
                versi: '1.0',
                aplikasi: 'POSweb by Rsby',
                waktu_backup: new Date().toISOString(),
                database: cfg.database
            },
            data: {}
        };

        const tables = ['pengaturan', 'users', 'produk', 'transaksi', 'detail_transaksi'];
        for (const tbl of tables) {
            const [rows] = await p.query(`SELECT * FROM \`${tbl}\``);
            backup.data[tbl] = rows;
        }

        const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `posweb-backup-${ts}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(backup, null, 2));
        console.log(`[POSweb] Backup berhasil: ${filename}`);
    } catch (err) {
        console.error('[Backup Error]', err);
        res.status(500).json({ success: false, pesan: 'Gagal membuat backup: ' + err.message });
    }
});

// ─── RESTORE DATABASE ──────────────────────────────────────

// Helper: konversi ISO string / Date object ke format MySQL DATETIME
// "2026-03-22T06:45:37.000Z" → "2026-03-22 06:45:37"
function toMysqlDatetime(val) {
    if (val === null || val === undefined) return null;
    const s = String(val);
    // Sudah format MySQL: "2026-03-22 06:45:37"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 19);
    // ISO format: "2026-03-22T06:45:37.000Z" atau "2026-03-22T06:45:37Z"
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            // Simpan dalam UTC agar konsisten
            return d.toISOString().replace('T', ' ').slice(0, 19);
        }
    }
    return val;
}

// Kolom-kolom bertipe TIMESTAMP/DATETIME di tiap tabel
const DATETIME_COLS = {
    transaksi: ['tanggal']
};

app.post('/api/restore', async (req, res) => {
    const { backup } = req.body;
    if (!backup || !backup.meta || !backup.data) {
        return res.status(400).json({ success: false, pesan: 'File backup tidak valid atau rusak.' });
    }
    try {
        const p = db.promise();
        const order = ['detail_transaksi', 'transaksi', 'produk', 'users', 'pengaturan'];

        await p.query('SET FOREIGN_KEY_CHECKS = 0');
        // Izinkan insert nilai datetime apapun tanpa strict mode
        await p.query("SET SESSION sql_mode = ''");

        for (const tbl of order) {
            const rows = backup.data[tbl];
            await p.query(`TRUNCATE TABLE \`${tbl}\``);
            if (!rows || !rows.length) continue;

            const keys = Object.keys(rows[0]);
            const dtCols = DATETIME_COLS[tbl] || [];

            const cols = keys.map(k => `\`${k}\``).join(', ');
            const placeholders = rows.map(() => '(' + keys.map(() => '?').join(', ') + ')').join(', ');
            const values = rows.flatMap(row =>
                keys.map(k => {
                    const v = row[k];
                    if (v === undefined) return null;
                    // Konversi kolom datetime
                    if (dtCols.includes(k)) return toMysqlDatetime(v);
                    return v;
                })
            );

            await p.query(`INSERT INTO \`${tbl}\` (${cols}) VALUES ${placeholders}`, values);
        }

        await p.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log(`[POSweb] Restore berhasil dari backup: ${backup.meta.waktu_backup}`);
        res.json({ success: true, pesan: 'Restore berhasil! Data telah dipulihkan.' });
    } catch (err) {
        try {
            await db.promise().query('SET FOREIGN_KEY_CHECKS = 1');
        } catch(e) {}
        console.error('[Restore Error]', err);
        res.status(500).json({ success: false, pesan: 'Restore gagal: ' + err.message });
    }
});

// ─── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[POSweb] Server aktif di port ${PORT}`));
