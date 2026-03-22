// ============================================================
// POSweb by Rsby — app.js (Fixed v2)
// ============================================================

// ─── GLOBAL STATE ───────────────────────────────────────────
var currentPermissions = [];
var activeCategory     = 'All';
var dataKatalog        = [];
var keranjang          = [];
var total              = 0;
var totalModal         = 0;
var profilToko         = {};
var lastTrxData        = {};
var currentLaporanType = 'harian';
var chartOmzetInstance    = null;
var chartTerlarisInstance = null;
var metodeBayarActive  = 'Tunai';
var isEditMode         = false;
var isEditUserMode     = false;
var semuaTransaksi     = [];
var dataTampilLaporan  = [];
var memoriRevisi       = {};
var confirmCallback    = null;

// ─── UTILS ──────────────────────────────────────────────────
// FIX #11: escape HTML entity untuk cegah XSS di innerHTML
function safeStr(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Versi untuk nilai dalam atribut onclick (tanpa HTML entity)
function safeAttr(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const formatRupiah = (a) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(a || 0);

function formatInputBayar(i) {
    const v = i.value.replace(/\D/g, '');
    i.value = v ? new Intl.NumberFormat('id-ID').format(v) : '';
}
function getAngkaMurni(s) {
    return parseInt((s || '').toString().replace(/\./g, '')) || 0;
}

// ─── MODAL: ALERT ──────────────────────────────────────────
function showAlert(title, msg, type = 'error') {
    const modal = document.getElementById('modalAlert');
    const icon  = document.getElementById('iconAlert');
    const isOk  = type === 'success';
    icon.className = `w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isOk ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`;
    icon.innerHTML = isOk
        ? '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>'
        : '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>';
    document.getElementById('titleAlert').innerText = title;
    document.getElementById('msgAlert').innerText   = msg;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}
function closeAlert() {
    const modal = document.getElementById('modalAlert');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// ─── MODAL: CONFIRM ────────────────────────────────────────
function showConfirm(title, msg, callback) {
    document.getElementById('titleConfirm').innerText = title;
    document.getElementById('msgConfirm').innerText   = msg;
    confirmCallback = callback;
    const modal = document.getElementById('modalConfirm');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}
function closeConfirm() {
    const modal = document.getElementById('modalConfirm');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// ─── SIDEBAR ───────────────────────────────────────────────
function toggleSidebar(forceClose = false) {
    const nav     = document.getElementById('mainNav');
    const overlay = document.getElementById('sidebarOverlay');
    if (!nav || !overlay || window.innerWidth >= 768) return;
    const isClosed = nav.classList.contains('-translate-x-full');
    if (forceClose || !isClosed) {
        nav.classList.add('-translate-x-full');
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        overlay.classList.remove('hidden');
        void overlay.offsetWidth;
        nav.classList.remove('-translate-x-full');
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
    }
}

// ─── PRINT ─────────────────────────────────────────────────
// FIX #3: restore mainApp ke 'flex' bukan '' supaya layout tidak rusak
function doPrintAction(printEl, restoreFn) {
    const mainApp = document.getElementById('mainApp');
    mainApp.style.setProperty('display', 'none', 'important');
    const modalAudit = document.getElementById('modalStrukLaporan');
    if (modalAudit) modalAudit.classList.add('hidden');
    printEl.classList.remove('hidden');
    printEl.classList.add('print-only');
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printEl.classList.remove('print-only');
            printEl.classList.add('hidden');
            mainApp.style.setProperty('display', 'flex', 'important'); // FIX #3
            if (restoreFn) restoreFn();
        }, 1500);
    }, 100);
}

// ─── METODE BAYAR ──────────────────────────────────────────
function pilihMetode(m) {
    metodeBayarActive = m;
    const btnT = document.getElementById('btnMetodeTunai');
    const btnQ = document.getElementById('btnMetodeQris');
    const inputUang = document.getElementById('uangBayar');
    const btnPas    = document.getElementById('btnUangPas');
    const active   = 'w-1/2 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition bg-blue-600 text-white shadow-md border border-blue-500';
    const inactive = 'w-1/2 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700';
    if (m === 'QRIS') {
        btnQ.className = active; btnT.className = inactive;
        inputUang.disabled = true; inputUang.classList.add('opacity-50');
        btnPas.disabled = true; btnPas.classList.add('opacity-50');
        if (total > 0) inputUang.value = new Intl.NumberFormat('id-ID').format(total);
    } else {
        btnT.className = active; btnQ.className = inactive;
        inputUang.disabled = false; inputUang.classList.remove('opacity-50');
        btnPas.disabled = false; btnPas.classList.remove('opacity-50');
        inputUang.value = '';
    }
    hitungKembalian();
}

// ─── AUTH ──────────────────────────────────────────────────
function checkAuth() {
    try {
        const role = localStorage.getItem('userRole') || '';
        const name = localStorage.getItem('userName') || '';
        if (name && name !== 'undefined' && name !== 'null' && name !== '') {
            // FIX #12: mainApp butuh display:flex
            document.getElementById('pageLogin').style.setProperty('display', 'none', 'important');
            document.getElementById('mainApp').style.setProperty('display', 'flex', 'important');
            document.getElementById('mainApp').classList.remove('hidden');
            const userInfoEl = document.getElementById('userInfo');
            if (userInfoEl) userInfoEl.innerText = name.toUpperCase();

            const all = ['dashboard','kasir','gudang','laporan','retur','pengguna','setting','reprint'];
            if (name === 'owner' || role === 'owner' || role === 'admin' || role.includes('dashboard')) {
                currentPermissions = [...all];
            } else if (typeof role === 'string' && role.trim() !== '') {
                currentPermissions = role.split(',').filter(Boolean);
            } else {
                currentPermissions = ['kasir'];
            }
            if (!currentPermissions.includes('kasir')) currentPermissions.push('kasir');
            // Kalau punya 'reprint' tapi tidak punya 'retur', tetap dapat akses tab Retur
            if (currentPermissions.includes('reprint') && !currentPermissions.includes('retur')) {
                currentPermissions.push('retur');
            }

            all.forEach(t => {
                const btn = document.getElementById('btnNav' + t.charAt(0).toUpperCase() + t.slice(1));
                if (btn) {
                    if (currentPermissions.includes(t)) { btn.style.removeProperty('display'); btn.classList.remove('hidden'); }
                    else { btn.style.setProperty('display', 'none', 'important'); }
                }
            });

            if (currentPermissions.includes('dashboard')) showTab('dashboard');
            else showTab('kasir');
            loadPengaturan();
        } else {
            document.getElementById('pageLogin').style.setProperty('display', 'flex', 'important');
            document.getElementById('pageLogin').classList.remove('hidden');
            document.getElementById('mainApp').style.setProperty('display', 'none', 'important');
        }
    } catch (err) { console.error('Auth Error:', err); }
}

async function login() {
    const u = document.getElementById('inputUser').value.trim();
    const p = document.getElementById('inputPass').value.trim();
    const btn = document.getElementById('btnLoginAction');
    if (!u || !p) return showAlert('Perhatian', 'Username dan Password wajib diisi!', 'error');
    btn.innerText = 'MEMPROSES...'; btn.disabled = true; btn.classList.add('opacity-50');
    try {
        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
        const d = await res.json();
        if (res.ok && d.success) {
            localStorage.setItem('userRole', d.role || 'kasir');
            localStorage.setItem('userName', d.username || u);
            document.getElementById('inputPass').value = '';
            checkAuth();
        } else { showAlert('Akses Ditolak', d.pesan || 'Username atau Password salah.', 'error'); }
    } catch { showAlert('Koneksi Gagal', 'Tidak dapat terhubung ke server.', 'error'); }
    finally { btn.innerText = 'MASUK SEKARANG'; btn.disabled = false; btn.classList.remove('opacity-50'); }
}

function logout() { localStorage.clear(); location.reload(); }

// ─── TAB SYSTEM ────────────────────────────────────────────
// FIX #12: tabKasir butuh display:flex, tab lain display:block
function showTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => {
        x.style.setProperty('display', 'none', 'important');
        x.classList.add('hidden');
    });
    document.querySelectorAll('[id^="btnNav"]').forEach(b => b.classList.remove('tab-active'));

    if (currentPermissions.includes(t)) {
        const tabEl = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (tabEl) {
            tabEl.style.setProperty('display', t === 'kasir' ? 'flex' : 'block', 'important');
            tabEl.classList.remove('hidden');
        }
        const btn = document.getElementById('btnNav' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) btn.classList.add('tab-active');
    }
    if (t === 'dashboard') loadDashboard();
    if (t === 'gudang')    loadBarang();
    if (t === 'laporan')   loadDataLaporan();
    if (t === 'kasir')     loadKatalogKasir();
    if (t === 'retur')     loadTabRetur();
    if (t === 'pengguna')  loadUsers();
    toggleSidebar(true);
}

// ─── GUDANG ────────────────────────────────────────────────
async function loadBarang() {
    try {
        const res = await fetch('/api/produk');
        const d   = await res.json();
        const arr = Array.isArray(d) ? d : [];
        let html  = '';
        arr.forEach(i => {
            const stokLabel = (i.stok || 0) <= 5
                ? `<span class="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black animate-pulse border border-red-200">${i.stok} ${safeStr(i.satuan)}</span>`
                : `<span class="font-black">${i.stok} <span class="text-[9px] text-slate-400">${safeStr(i.satuan)}</span></span>`;
            html += `<tr class="border-b hover:bg-slate-50 transition">
              <td class="p-3"><div class="font-bold text-slate-800">${safeStr(i.nama)} <span class="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ml-1 border">${safeStr(i.kategori||'-')}</span></div><div class="text-[9px] text-slate-400 font-mono mt-0.5">${safeStr(i.barcode)}</div></td>
              <td class="p-3 text-right font-bold text-slate-500">${formatRupiah(i.harga_beli)}</td>
              <td class="p-3 text-right font-black text-blue-600">${formatRupiah(i.harga_jual)}</td>
              <td class="p-3 text-center">${stokLabel}</td>
              <td class="p-3 text-center">
                <button onclick="siapkanEdit('${safeAttr(i.barcode)}','${safeAttr(i.nama)}','${i.harga_jual}','${i.stok}','${i.harga_beli}','${safeAttr(i.kategori||'-')}','${safeAttr(i.satuan||'pcs')}')" class="text-blue-600 font-bold hover:underline mr-3 text-[10px] uppercase">Edit</button>
                <button onclick="hapusBarang('${safeAttr(i.barcode)}')" class="text-red-500 font-bold hover:underline text-[10px] uppercase">Hapus</button>
              </td>
            </tr>`;
        });
        document.getElementById('listBarang').innerHTML = html;
        // Isi auto barcode setelah data produk dimuat
        if (!isEditMode) autoNextBarcode();
    } catch(e) { console.error(e); }
}

function siapkanEdit(b, n, hj, s, hb, k, st) {
    document.getElementById('addBarcode').value = b; document.getElementById('addBarcode').disabled = true; document.getElementById('addBarcode').classList.add('opacity-50');
    document.getElementById('addNama').value = n; document.getElementById('addHarga').value = hj; document.getElementById('addStok').value = s;
    document.getElementById('addHargaBeli').value = hb; document.getElementById('addKategori').value = k; document.getElementById('addSatuan').value = st;
    isEditMode = true; document.getElementById('btnBatalEdit').classList.remove('hidden');
    const btn = document.getElementById('btnSimpanBarang');
    if (btn) { btn.innerText = 'Update Barang'; btn.classList.replace('bg-slate-900','bg-orange-500'); btn.classList.replace('hover:bg-black','hover:bg-orange-600'); }
}

function batalEdit() {
    ['addBarcode','addNama','addHarga','addStok','addHargaBeli','addKategori','addSatuan'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('addBarcode').disabled = false; document.getElementById('addBarcode').classList.remove('opacity-50');
    isEditMode = false; document.getElementById('btnBatalEdit').classList.add('hidden');
    const btn = document.getElementById('btnSimpanBarang');
    if (btn) { btn.innerText = 'Simpan Barang'; btn.classList.replace('bg-orange-500','bg-slate-900'); btn.classList.replace('hover:bg-orange-600','hover:bg-black'); }
    // Isi otomatis barcode berikutnya setelah reset form
    autoNextBarcode();
}

// Generate barcode urutan berikutnya — fetch langsung dari DB
// supaya tidak bergantung pada dataKatalog yang mungkin belum ter-load
async function autoNextBarcode() {
    const el = document.getElementById('addBarcode');
    if (!el || isEditMode) return;
    try {
        const res  = await fetch('/api/produk');
        const data = await res.json();
        const arr  = Array.isArray(data) ? data : [];

        // Ambil semua barcode yang berformat numerik murni
        const nums = arr
            .map(i => (i.barcode || '').trim())
            .filter(b => /^[0-9]+$/.test(b))
            .map(b => parseInt(b, 10));

        if (!nums.length) {
            el.value = '001';
            return;
        }
        const next = Math.max(...nums) + 1;
        // Pad ke 3 digit minimal (001..099, lalu 100, 101, dst)
        el.value = String(next).padStart(3, '0');
    } catch { el.value = ''; }
}

function filterGudang() {
    const kw = (document.getElementById('cariBarangGudang')?.value || '').toLowerCase();
    Array.from(document.getElementById('listBarang').getElementsByTagName('tr')).forEach(r => r.style.display = r.innerText.toLowerCase().includes(kw) ? '' : 'none');
}

async function simpanBarang() {
    const b = document.getElementById('addBarcode').value.trim(); const n = document.getElementById('addNama').value.trim(); const hj = document.getElementById('addHarga').value;
    const hb = document.getElementById('addHargaBeli').value || 0; const s = document.getElementById('addStok').value || 0;
    const k = (document.getElementById('addKategori').value.trim() || '-').toUpperCase(); const st = document.getElementById('addSatuan').value.trim() || 'pcs';
    if (!b || !n || !hj) return showAlert('Perhatian', 'Barcode, Nama Produk, dan Harga Jual WAJIB diisi!', 'error');
    const btn = document.getElementById('btnSimpanBarang');
    // FIX #7: disable button untuk cegah double-submit
    if (btn) { btn.innerText = 'MENYIMPAN...'; btn.disabled = true; btn.classList.add('opacity-50'); }
    try {
        const res = await fetch(isEditMode ? `/api/produk/${b}` : '/api/produk', {
            method: isEditMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: b, nama: n, harga_jual: hj, harga_beli: hb, stok: s, kategori: k, satuan: st }),
        });
        const rd = await res.json();
        if (res.ok && rd.success) { showAlert('Sukses', 'Data barang berhasil disimpan!', 'success'); batalEdit(); loadBarang(); loadKatalogKasir(); }
        else { showAlert('Gagal', rd.pesan || 'Barcode mungkin sudah digunakan.', 'error'); }
    } catch { showAlert('Gagal', 'Koneksi ke server terputus.', 'error'); }
    finally { if (btn) { btn.innerText = isEditMode ? 'Update Barang' : 'Simpan Barang'; btn.disabled = false; btn.classList.remove('opacity-50'); } }
}

async function hapusBarang(b) {
    showConfirm('Hapus Barang?', 'Barang ini akan dihapus secara permanen. Lanjutkan?', async () => {
        await fetch(`/api/produk/${b}`, { method: 'DELETE' }); loadBarang(); loadKatalogKasir(); showAlert('Terhapus', 'Barang berhasil dihapus.', 'success');
    });
}

// ─── KASIR ─────────────────────────────────────────────────
async function loadKatalogKasir() {
    try {
        const res = await fetch('/api/produk');
        const d   = await res.json();
        dataKatalog = Array.isArray(d) ? d : []; // fetch SEKALI simpan global

        const cats = ['All'];
        dataKatalog.forEach(i => {
            // Normalisasi uppercase supaya 'rokok' dan 'ROKOK' dianggap sama
            const k = (i.kategori || '-').toUpperCase();
            if (!cats.includes(k)) cats.push(k);
        });
        const catContainer = document.getElementById('containerKategori');
        if (catContainer) {
            catContainer.innerHTML = cats.map(c =>
                `<button onclick="setCategory('${safeAttr(c)}')" class="px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory===c?'bg-blue-600 text-white border-blue-600 shadow-md':'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}">${safeStr(c)}</button>`
            ).join('');
        }
        filterKatalog();
    } catch(e) { console.error('Gagal load katalog:', e); dataKatalog = []; filterKatalog(); }
}

function setCategory(c) { activeCategory = c === 'All' ? 'All' : c.toUpperCase(); loadKatalogKasir(); }

function filterKatalog() {
    if (!dataKatalog) return;
    const kw = ((document.getElementById('cariKatalog')?.value || '') || (document.getElementById('scanBarcode')?.value || '')).toLowerCase();
    const filtered = dataKatalog.filter(i => {
        const matchSearch = (i.nama||'').toLowerCase().includes(kw) || (i.barcode||'').toLowerCase().includes(kw);
        // Normalisasi uppercase supaya 'rokok' == 'ROKOK'
        const matchCat    = activeCategory === 'All' || (i.kategori||'-').toUpperCase() === activeCategory;
        return matchSearch && matchCat;
    });
    const listEl = document.getElementById('listKatalogKasir'); if (!listEl) return;
    if (!filtered.length) { listEl.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 italic text-xs font-bold">Barang tidak ditemukan</div>'; return; }
    listEl.innerHTML = filtered.map(i => {
        const stockLabel = (i.stok||0) <= 5
            ? `<span class="bg-red-50 text-red-500 border border-red-200 px-1 rounded animate-pulse text-[8px] font-bold">Sisa: ${i.stok} ${safeStr(i.satuan)}</span>`
            : `<span class="bg-slate-50 text-slate-400 border px-1 rounded text-[8px] font-bold">Stok: ${i.stok} ${safeStr(i.satuan)}</span>`;
        return `<div class="bg-white border border-slate-200 p-2 md:p-2.5 rounded-xl cursor-pointer hover:border-blue-400 active:scale-95 transition-all shadow-sm flex flex-col justify-between min-h-0" onclick="tambahItem('${safeAttr(i.barcode)}')">
          <div>
            <div class="font-bold text-[10px] md:text-[11px] uppercase truncate leading-tight mb-0.5" title="${safeStr(i.nama)}">${safeStr(i.nama)}</div>
            <div class="text-[8px] font-mono text-slate-400 mb-1">${safeStr(i.barcode)}</div>
            <div class="text-blue-600 font-black text-xs md:text-sm">${formatRupiah(i.harga_jual)}</div>
          </div>
          <div class="mt-1">${stockLabel}</div>
        </div>`;
    }).join('');
}

function handleScan(e) {
    // Filter realtime saat mengetik
    filterKatalog();

    // Tangkap Enter di desktop maupun tombol "Go"/"Done" di keyboard mobile
    if (e.key === 'Enter' || e.keyCode === 13) {
        // Cegah default: pindah focus ke input berikutnya (cariKatalog) di mobile
        e.preventDefault();
        e.stopPropagation();

        const bc = document.getElementById('scanBarcode').value.trim();
        if (!bc) return;

        const item = dataKatalog.find(i => i.barcode === bc);
        if (item) {
            tambahItem(bc);
        } else {
            showAlert('Tidak Ditemukan', 'Barcode tidak terdaftar.', 'error');
        }
        document.getElementById('scanBarcode').value = '';
        filterKatalog();

        // Kembalikan focus ke input scan supaya kasir bisa langsung scan lagi
        document.getElementById('scanBarcode').focus();
    }
}

function tambahItem(b) {
    const item = dataKatalog.find(x => x.barcode === b);
    if (!item || item.stok <= 0) return showAlert('Stok Habis', 'Barang ini kosong.', 'error');
    const idx = keranjang.findIndex(k => k.barcode === b);
    if (idx > -1) {
        if (keranjang[idx].qty + 1 > item.stok) return showAlert('Stok Kurang', 'Sisa stok tidak mencukupi.', 'error');
        keranjang[idx].qty++; keranjang[idx].subtotal = keranjang[idx].qty * keranjang[idx].harga_jual;
    } else { keranjang.push({ ...item, qty: 1, subtotal: parseFloat(item.harga_jual), harga_beli: parseFloat(item.harga_beli || 0) }); }
    renderKeranjang();
}

function gantiQty(idx, m) {
    keranjang[idx].qty += m;
    if (keranjang[idx].qty <= 0) { keranjang.splice(idx, 1); }
    else if (keranjang[idx].qty > keranjang[idx].stok) { showAlert('Batas Maksimal', 'Jumlah melebihi stok.', 'error'); keranjang[idx].qty--; }
    if (keranjang[idx]) keranjang[idx].subtotal = keranjang[idx].qty * keranjang[idx].harga_jual;
    renderKeranjang();
}

function renderKeranjang() {
    total = 0; totalModal = 0; // FIX #8: selalu reset di sini
    if (!keranjang.length) {
        document.getElementById('areaKeranjang').innerHTML = '<div class="text-center py-12 text-slate-300 italic text-[11px] uppercase font-bold tracking-widest">Keranjang Kosong</div>';
        document.getElementById('totalBelanja').innerText = 'Rp0'; document.getElementById('itemCount').innerText = '0 ITEMS';
        if (metodeBayarActive === 'QRIS') document.getElementById('uangBayar').value = '';
        hitungKembalian(); return;
    }
    let html = '<table class="w-full">';
    keranjang.forEach((i, idx) => {
        total += i.subtotal; totalModal += (i.harga_beli * i.qty);
        html += `<tr class="border-b hover:bg-slate-50 transition">
          <td class="py-2 px-1"><div class="font-bold text-[11px] leading-tight" title="${safeStr(i.nama)}">${safeStr(i.nama)}</div><div class="text-[9px] text-slate-400 mt-0.5">@${formatRupiah(i.harga_jual)}</div></td>
          <td align="center"><div class="flex items-center justify-center gap-1.5 bg-slate-100 rounded-lg p-1"><button onclick="gantiQty(${idx},-1)" class="w-6 h-6 bg-white text-red-500 rounded shadow-sm font-black">-</button><span class="w-5 font-black text-[11px] text-center">${i.qty}</span><button onclick="gantiQty(${idx},1)" class="w-6 h-6 bg-white text-blue-600 rounded shadow-sm font-black">+</button></div></td>
          <td align="right" class="font-black text-[11px]">${formatRupiah(i.subtotal)}</td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('areaKeranjang').innerHTML = html;
    document.getElementById('totalBelanja').innerText = formatRupiah(total);
    document.getElementById('itemCount').innerText = keranjang.length + ' ITEMS';
    if (metodeBayarActive === 'QRIS') document.getElementById('uangBayar').value = new Intl.NumberFormat('id-ID').format(total);
    hitungKembalian();
}

function hitungKembalian() {
    const b = getAngkaMurni(document.getElementById('uangBayar').value);
    document.getElementById('uangKembalian').innerText = b >= total ? formatRupiah(b - total) : 'Rp0';
}
function setUangPas() {
    if (total <= 0) return;
    document.getElementById('uangBayar').value = new Intl.NumberFormat('id-ID').format(total); hitungKembalian();
}

async function prosesBayar() {
    const b = getAngkaMurni(document.getElementById('uangBayar').value);
    if (!keranjang.length) return showAlert('Pembayaran Gagal', 'Keranjang kosong.', 'error');
    if (metodeBayarActive === 'Tunai' && b < total) return showAlert('Pembayaran Gagal', 'Uang tunai kurang.', 'error');
    const no = 'TRX-' + Date.now(); const kasir = localStorage.getItem('userName') || 'Admin';
    try {
        const res = await fetch('/api/transaksi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ no_struk: no, total_bayar: total, total_modal: totalModal, keranjang, kasir, metode_bayar: metodeBayarActive }) });
        if (!res.ok) throw new Error('Server error');
        document.getElementById('strukTanggal').innerText   = new Date().toLocaleString('id-ID');
        document.getElementById('strukNomor').innerText     = no;
        document.getElementById('strukNamaKasir').innerText = kasir.toUpperCase();
        document.getElementById('strukItem').innerHTML = keranjang.map(i => `<tr><td class="pb-1">${safeStr(i.nama)}</td><td align="right" class="pb-1 font-bold">${i.qty}</td></tr>`).join('');
        document.getElementById('strukTotalPrint').innerText  = formatRupiah(total);
        document.getElementById('strukMetodePrint').innerText = metodeBayarActive.toUpperCase();
        const isTunai = metodeBayarActive === 'Tunai';
        document.getElementById('areaStrukTunai').classList.toggle('hidden', !isTunai);
        document.getElementById('areaStrukKembali').classList.toggle('hidden', !isTunai);
        if (isTunai) { document.getElementById('strukTunaiPrint').innerText = formatRupiah(b); document.getElementById('strukKembaliPrint').innerText = formatRupiah(b - total); }
        const trxResult = await res.json();
        lastTrxData = { no, total, bayar: b, kembali: b - total, items: [...keranjang], metode: metodeBayarActive, kasir, id_transaksi: trxResult.id_transaksi };
        document.getElementById('modalKembalian').innerText = formatRupiah(b - total);
        document.getElementById('modalSuksesBayar').classList.remove('hidden');
    } catch { showAlert('Koneksi Gagal', 'Gagal memproses transaksi.', 'error'); }
}

function cetakStrukKasir() {
    document.getElementById('modalSuksesBayar').classList.add('hidden');
    doPrintAction(document.getElementById('areaStruk'), () => document.getElementById('modalSuksesBayar').classList.remove('hidden'));
}
function kirimWA() {
    // Tampilkan modal input nomor WA dulu
    const modal = document.getElementById('modalInputWA');
    const input = document.getElementById('inputNomorWA');
    if (!modal || !input) return;
    input.value = '';
    modal.classList.remove('hidden', 'opacity-0');
    setTimeout(() => input.focus(), 100);
}

function closeModalWA() {
    const modal = document.getElementById('modalInputWA');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 250);
}

function kirimWAKeNomor() {
    let nomor = (document.getElementById('inputNomorWA')?.value || '').trim().replace(/[^0-9]/g, '');
    if (!nomor) {
        document.getElementById('inputNomorWA').focus();
        document.getElementById('inputNomorWA').classList.add('ring-2', 'ring-red-400');
        return;
    }
    document.getElementById('inputNomorWA').classList.remove('ring-2', 'ring-red-400');

    // Normalisasi: 08xxx → 628xxx, 8xxx → 628xxx
    if (nomor.startsWith('0'))        nomor = '62' + nomor.slice(1);
    else if (!nomor.startsWith('62')) nomor = '62' + nomor;

    // Simpan nomor WA ke DB (fire and forget, tidak blocking)
    if (lastTrxData.id_transaksi) {
        fetch('/api/transaksi/wa/' + lastTrxData.id_transaksi, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wa_pelanggan: nomor })
        }).catch(() => {});
    }

    // Susun teks struk
    let t = '';
    t += '*' + (profilToko.nama_toko || 'Toko') + '*\n';
    if (profilToko.alamat_toko) t += profilToko.alamat_toko + '\n';
    if (profilToko.telp_toko)   t += 'Telp: ' + profilToko.telp_toko + '\n';
    t += '\n';
    t += 'No Struk : *' + lastTrxData.no + '*\n';
    t += 'Tanggal  : ' + new Date().toLocaleString('id-ID') + '\n';
    t += 'Kasir    : ' + (lastTrxData.kasir || 'Admin') + '\n';
    t += '\n--------------------------------\n';
    lastTrxData.items.forEach(function(i) {
        t += i.nama + '\n';
        t += '  ' + i.qty + ' x ' + formatRupiah(i.harga_jual) + ' = ' + formatRupiah(i.qty * i.harga_jual) + '\n';
    });
    t += '--------------------------------\n';
    t += '*TOTAL    : ' + formatRupiah(lastTrxData.total) + '*\n';
    t += 'Metode   : ' + lastTrxData.metode.toUpperCase() + '\n';
    if (lastTrxData.metode === 'Tunai') {
        t += 'Bayar    : ' + formatRupiah(lastTrxData.bayar) + '\n';
        t += 'Kembali  : ' + formatRupiah(lastTrxData.kembali) + '\n';
    }
    t += '\n_Terima kasih sudah berbelanja!_ 🙏';

    closeModalWA();
    window.open('https://wa.me/' + nomor + '?text=' + encodeURIComponent(t), '_blank');
}
function selesaiBayar() {
    document.getElementById('modalSuksesBayar').classList.add('hidden');
    keranjang = []; total = 0; totalModal = 0; // FIX #8: reset eksplisit
    document.getElementById('uangBayar').value = '';
    pilihMetode('Tunai'); renderKeranjang(); loadKatalogKasir(); loadDataLaporan();
}

// ─── DASHBOARD ─────────────────────────────────────────────
async function loadDashboard() {
    try {
        const [resTx, resPr, resTr] = await Promise.all([fetch('/api/transaksi'), fetch('/api/produk'), fetch('/api/terlaris')]);
        const [txData, prData, trData] = await Promise.all([resTx.json(), resPr.json(), resTr.json()]);
        let omzetHariIni = 0, labaHariIni = 0; const last7Days = [], omzet7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i); const dStr = d.toISOString().split('T')[0];
            last7Days.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
            const dailyTx = (Array.isArray(txData) ? txData : []).filter(t => t.tanggal?.startsWith(dStr));
            const dailyOmzet = dailyTx.reduce((s, t) => s + parseFloat(t.total_bayar || 0), 0);
            omzet7Days.push(dailyOmzet);
            if (i === 0) { omzetHariIni = dailyOmzet; labaHariIni = dailyTx.reduce((s, t) => s + (parseFloat(t.total_bayar||0) - parseFloat(t.total_modal||0)), 0); }
        }
        document.getElementById('dashOmzetHariIni').innerText = formatRupiah(omzetHariIni);
        document.getElementById('dashLabaHariIni').innerText  = formatRupiah(labaHariIni);
        document.getElementById('dashTotalProduk').innerText  = (Array.isArray(prData) ? prData : []).length;
        document.getElementById('dashTotalStok').innerText    = (Array.isArray(prData) ? prData : []).reduce((s, p) => s + parseInt(p.stok || 0), 0);
        if (typeof Chart !== 'undefined') {
            if (chartOmzetInstance) chartOmzetInstance.destroy();
            chartOmzetInstance = new Chart(document.getElementById('chartOmzet').getContext('2d'), { type: 'line', data: { labels: last7Days, datasets: [{ label: 'Omzet (Rp)', data: omzet7Days, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', borderWidth: 2, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
            if (chartTerlarisInstance) chartTerlarisInstance.destroy();
            const topData = Array.isArray(trData) ? trData : [];
            chartTerlarisInstance = new Chart(document.getElementById('chartTerlaris').getContext('2d'), { type: 'bar', data: { labels: topData.map(d => d.nama_barang), datasets: [{ label: 'Terjual (Qty)', data: topData.map(d => d.total_qty), backgroundColor: '#16a34a', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
        }
    } catch(e) { console.error(e); }
}

// ─── SETTING ───────────────────────────────────────────────
async function loadPengaturan() {
    try {
        const res = await fetch('/api/pengaturan'); const d = await res.json();
        if (d) {
            profilToko = d;
            document.getElementById('setNamaToko').value  = d.nama_toko   || '';
            document.getElementById('setAlamat').value    = d.alamat_toko || '';
            document.getElementById('setTelp').value      = d.telp_toko   || '';
            document.getElementById('headerNamaToko').innerText     = d.nama_toko   || 'POSweb by Rsby';
            document.getElementById('headerAlamatTelp').innerText   = `${d.alamat_toko||''} | Telp: ${d.telp_toko||''}`;
            document.getElementById('strukNamaTokoPrint').innerText  = d.nama_toko   || '';
            document.getElementById('strukAlamatTelpPrint').innerText= d.alamat_toko || '';
        }
        const kertas = localStorage.getItem('ukuranKertas') || '58mm';
        const footer  = localStorage.getItem('footerStruk')  || 'Terima Kasih';
        document.getElementById('setUkuranKertas').value = kertas;
        document.getElementById('setFooterStruk').value  = footer;
        document.getElementById('strukFooterText').innerText = footer;
        const areaStruk = document.getElementById('areaStruk');
        if (kertas === '80mm') areaStruk.classList.replace('max-w-[58mm]', 'max-w-[80mm]');
        else areaStruk.classList.replace('max-w-[80mm]', 'max-w-[58mm]');
    } catch(e) { console.error(e); }
}

async function simpanPengaturan() {
    const d = { nama_toko: document.getElementById('setNamaToko').value, alamat_toko: document.getElementById('setAlamat').value, telp_toko: document.getElementById('setTelp').value };
    try { await fetch('/api/pengaturan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); showAlert('Sukses', 'Profil Toko tersimpan.', 'success'); loadPengaturan(); }
    catch { showAlert('Gagal', 'Gagal menyimpan pengaturan.', 'error'); }
}

function simpanPengaturanPrinter() {
    const kertas = document.getElementById('setUkuranKertas').value; const footer = document.getElementById('setFooterStruk').value;
    localStorage.setItem('ukuranKertas', kertas); localStorage.setItem('footerStruk', footer);
    document.getElementById('strukFooterText').innerText = footer || 'Terima Kasih';
    const areaStruk = document.getElementById('areaStruk');
    if (kertas === '80mm') areaStruk.classList.replace('max-w-[58mm]', 'max-w-[80mm]'); else areaStruk.classList.replace('max-w-[80mm]', 'max-w-[58mm]');
    showAlert('Sukses', 'Printer dan Struk tersimpan.', 'success');
}

// ─── LAPORAN ───────────────────────────────────────────────
async function loadDataLaporan() {
    try { const res = await fetch('/api/transaksi'); const d = await res.json(); semuaTransaksi = Array.isArray(d) ? d : []; renderLaporan(currentLaporanType || 'harian'); }
    catch { semuaTransaksi = []; renderLaporan('harian'); }
}

// FIX #4: gunakan classList saja — tidak campur dengan style.setProperty
function renderLaporan(tipe) {
    currentLaporanType = tipe;
    document.querySelectorAll('.btn-filter-lap').forEach(b => {
        b.classList.remove('bg-green-600','text-white'); b.classList.add('bg-gray-200','text-gray-700');
    });
    const aBtn = document.getElementById('btnLap' + tipe.charAt(0).toUpperCase() + tipe.slice(1));
    if (aBtn) { aBtn.classList.remove('bg-gray-200','text-gray-700'); aBtn.classList.add('bg-green-600','text-white'); }

    const now = new Date();
    const todayStr  = now.toISOString().split('T')[0];
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    if (tipe === 'harian') {
        document.getElementById('filterBulan').classList.add('hidden');
        document.getElementById('wrapFilterHari').classList.remove('hidden'); document.getElementById('wrapFilterHari').classList.add('flex');
        document.getElementById('areaCariStruk').classList.remove('hidden');
        if (!document.getElementById('filterMulai').value)   document.getElementById('filterMulai').value   = todayStr;
        if (!document.getElementById('filterSelesai').value) document.getElementById('filterSelesai').value = todayStr;
        const startDate = new Date(document.getElementById('filterMulai').value);   startDate.setHours(0,0,0,0);
        const endDate   = new Date(document.getElementById('filterSelesai').value); endDate.setHours(23,59,59,999);
        dataTampilLaporan = semuaTransaksi.filter(t => { if (!t.tanggal) return false; const ts = new Date(t.tanggal).getTime(); return ts >= startDate.getTime() && ts <= endDate.getTime(); });
        const fMulai = startDate.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); const fSelesai = endDate.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
        document.getElementById('teksFilterLaporan').innerText = startDate.getTime()===endDate.getTime() ? `LAPORAN: ${fMulai}` : `LAPORAN: ${fMulai} - ${fSelesai}`;
    } else {
        document.getElementById('wrapFilterHari').classList.add('hidden'); document.getElementById('wrapFilterHari').classList.remove('flex');
        document.getElementById('filterBulan').classList.remove('hidden');
        document.getElementById('areaCariStruk').classList.add('hidden');
        if (!document.getElementById('filterBulan').value) document.getElementById('filterBulan').value = thisMonth;
        const selMonth = document.getElementById('filterBulan').value;
        dataTampilLaporan = semuaTransaksi.filter(t => { if (!t.tanggal) return false; const d = new Date(t.tanggal); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === selMonth; });
        document.getElementById('teksFilterLaporan').innerText = `LAPORAN BULANAN: ${selMonth}`;
    }
    gambarTabelLaporan(dataTampilLaporan);
}

function gambarTabelLaporan(data) {
    let o = 0, m = 0; const list = document.getElementById('listLaporan'); const thead = document.getElementById('theadLaporan'); list.innerHTML = '';
    if (currentLaporanType === 'harian') {
        if (thead) thead.innerHTML = '<th class="p-4">Struk / Kasir</th><th class="p-4 text-right">Rincian</th><th class="p-4 text-center">Audit</th>';
        if (!data?.length) { list.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-bold">Data kosong.</td></tr>`; }
        else { data.forEach(t => {
            const tb = parseFloat(t.total_bayar)||0; const tm = parseFloat(t.total_modal)||0; o+=tb; m+=tm;
            list.innerHTML += `<tr class="border-b hover:bg-slate-50 transition"><td class="p-4"><div class="font-bold text-blue-600 font-mono text-[10px] uppercase">${t.no_struk}</div><div class="text-[9px] text-slate-400 font-bold mt-0.5">${new Date(t.tanggal).toLocaleString('id-ID')}</div><div class="text-[8px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded border mt-1 uppercase font-bold">Kasir: ${safeStr(t.kasir)||'Admin'} • ${t.metode_bayar||'TUNAI'}</div></td><td class="p-4 text-right"><div class="font-bold text-slate-800 text-xs">${formatRupiah(tb)}</div><div class="text-[9px] text-green-600 font-black mt-0.5">Laba: ${formatRupiah(tb-tm)}</div></td><td class="p-4 text-center"><button onclick="lihatDetailStruk('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')" class="bg-slate-100 border text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 shadow-sm active:scale-95">Audit</button></td></tr>`;
        }); }
    } else {
        if (thead) thead.innerHTML = '<th class="p-4">Periode Bulan</th><th class="p-4 text-right">Total Modal</th><th class="p-4 text-right">Omzet & Laba</th>';
        if (!data?.length) { list.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-bold">Data kosong.</td></tr>`; }
        else {
            data.forEach(t => { o+=parseFloat(t.total_bayar)||0; m+=parseFloat(t.total_modal)||0; });
            const [y,mn] = document.getElementById('filterBulan').value.split('-');
            const monthName = new Date(y,mn-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
            list.innerHTML = `<tr class="border-b hover:bg-slate-50"><td class="p-4"><div class="font-bold text-blue-600 text-sm uppercase">${monthName}</div><div class="text-[9px] text-slate-400 font-bold mt-0.5">Akumulasi ${data.length} Transaksi</div></td><td class="p-4 text-right font-bold text-slate-700 text-xs">${formatRupiah(m)}</td><td class="p-4 text-right"><div class="font-bold text-slate-800 text-xs">Omzet: ${formatRupiah(o)}</div><div class="text-[10px] text-green-600 font-black mt-0.5">Laba: ${formatRupiah(o-m)}</div></td></tr>`;
        }
    }
    document.getElementById('lapOmzet').innerText = formatRupiah(o);
    document.getElementById('lapModal').innerText = formatRupiah(m);
    document.getElementById('lapLaba').innerText  = formatRupiah(o-m);
}

// ─── PERMISSION HELPER ────────────────────────────────────
function hasPermission(p) {
    // owner/admin/dashboard sudah dapat semua permission
    const role = localStorage.getItem('userRole') || '';
    if (['owner','admin'].includes(role) || role.includes('dashboard')) return true;
    return currentPermissions.includes(p);
}

// ─── AUDIT MODAL ───────────────────────────────────────────
// Hanya dua tombol: Print Ulang + Retur ke Kasir
async function lihatDetailStruk(id, no, tgl, tot, kas, metode) {
    try {
        const res = await fetch('/api/transaksi/detail/' + id);
        const d   = await res.json();
        // Simpan semua data struk di memoriRevisi — dibutuhkan oleh returKeKasir
        memoriRevisi = { id, no, tanggal: tgl, total: tot, kasir: kas, metode, items: d };

        // ── Rincian item ──
        let h = `
          <div class="mb-3 text-center border-b pb-3">
            <div class="font-black text-sm uppercase text-slate-800">${safeStr(profilToko.nama_toko||'')}</div>
            <div class="text-[9px] font-bold text-slate-400 mt-1">${new Date(tgl).toLocaleString('id-ID')}</div>
            <div class="text-[10px] bg-blue-50 text-blue-600 inline-block px-2 py-0.5 rounded font-mono font-bold mt-1 border border-blue-100">${no}</div>
            <div class="text-[9px] font-bold text-slate-500 mt-1 uppercase">Kasir: ${safeStr(kas)} • ${safeStr(metode)}</div>
          </div>
          <table class="w-full text-xs mb-3">
            <tbody class="divide-y divide-slate-100 border-t border-b">`;

        d.forEach(i => {
            h += `<tr>
              <td class="py-2">
                <div class="font-bold text-slate-700">${safeStr(i.nama_barang)}</div>
                <div class="text-[9px] text-slate-400">@${formatRupiah(i.harga)}</div>
              </td>
              <td class="py-2 text-center text-[10px] font-bold text-blue-600">x${i.qty}</td>
              <td class="py-2 text-right font-black text-slate-800 text-[11px]">${formatRupiah(i.subtotal)}</td>
            </tr>`;
        });

        h += `</tbody></table>
          <div class="flex justify-between font-black text-sm pt-1 text-slate-800 border-t mt-1 pt-2">
            <span>TOTAL</span>
            <span class="text-blue-600">${formatRupiah(tot)}</span>
          </div>`;

        document.getElementById('isiModalStruk').innerHTML = h;

        // ── Tombol aksi: hanya Print Ulang + Retur ──
        const reprintData = JSON.stringify({
            no, tanggal: new Date(tgl).toLocaleString('id-ID'),
            kasir: kas, metode, total: tot, items: d
        });

        // Kontrol tombol berdasarkan permission user
        const showReprint = hasPermission('reprint');
        const showRetur   = hasPermission('retur');
        const btnReprint  = showReprint ? `
          <button onclick='cetakUlangStruk(${reprintData})'
            class="w-full bg-blue-500 text-white font-bold py-3 text-sm rounded-xl hover:bg-blue-600 active:scale-95 transition uppercase tracking-widest mb-2">
            🖨️ Print Ulang Struk
          </button>` : '';
        const btnRetur = showRetur ? `
          <button onclick="returKeKasir()"
            class="w-full bg-orange-500 text-white font-bold py-3 text-sm rounded-xl hover:bg-orange-600 active:scale-95 transition uppercase tracking-widest mb-2">
            ↩ Retur — Edit &amp; Bayar Ulang
          </button>` : '';

        document.getElementById('modalStrukActions').innerHTML = btnReprint + btnRetur + `
          <button onclick="tutupModalStruk()"
            class="w-full bg-slate-100 text-slate-600 font-bold py-2.5 text-sm rounded-xl hover:bg-slate-200 transition">
            Tutup
          </button>`;

        document.getElementById('modalStrukLaporan').classList.remove('hidden');
    } catch {
        showAlert('Error', 'Gagal memuat rincian transaksi.', 'error');
    }
}

// ── RETUR: void transaksi lama → isi keranjang otomatis → pindah ke kasir ──
async function returKeKasir() {
    // Tutup modal struk DULU sebelum buka confirm — hindari tumpukan modal
    tutupModalStruk();

    showConfirm(
        'Retur Transaksi?',
        `Struk ${memoriRevisi.no} akan di-void. Item-itemnya otomatis masuk ke keranjang kasir — kasir bisa tambah/kurang sebelum bayar ulang.`,
        async () => {
            try {
                // 1. Void transaksi lama (stok kembali ke gudang via server)
                const delRes = await fetch('/api/transaksi/' + memoriRevisi.id, { method: 'DELETE' });
                if (!delRes.ok) throw new Error('Gagal void transaksi');

                // 2. Reload katalog untuk data terbaru
                await loadKatalogKasir();

                // 3. Isi keranjang dari item struk lama
                // JANGAN filter/batasi qty dari stok — stok sudah dikembalikan via void
                keranjang  = [];
                total      = 0;
                totalModal = 0;

                memoriRevisi.items.forEach(item => {
                    const katalogItem = dataKatalog.find(k => k.barcode === item.barcode);
                    const qty = parseInt(item.qty) || 1;

                    if (katalogItem) {
                        // Produk masih ada — pakai data katalog terkini
                        // stok di katalog sudah +qty karena void, tapi set manual untuk aman
                        keranjang.push({
                            barcode:    katalogItem.barcode,
                            nama:       katalogItem.nama,
                            harga_jual: parseFloat(katalogItem.harga_jual),
                            harga_beli: parseFloat(katalogItem.harga_beli || 0),
                            stok:       parseInt(katalogItem.stok) + qty,
                            satuan:     katalogItem.satuan || 'pcs',
                            kategori:   katalogItem.kategori || '-',
                            qty:        qty,
                            subtotal:   qty * parseFloat(katalogItem.harga_jual),
                        });
                    } else {
                        // Produk sudah dihapus dari katalog — pakai data struk lama
                        keranjang.push({
                            barcode:    item.barcode,
                            nama:       item.nama_barang,
                            harga_jual: parseFloat(item.harga),
                            harga_beli: 0,
                            stok:       qty,
                            satuan:     'pcs',
                            kategori:   '-',
                            qty:        qty,
                            subtotal:   qty * parseFloat(item.harga),
                        });
                    }
                });

                // 4. Pindah ke kasir
                loadDataLaporan();
                showTab('kasir');
                renderKeranjang();

                // 5. Notifikasi
                if (keranjang.length > 0) {
                    showAlert(
                        'Retur Berhasil',
                        `${keranjang.length} item dari struk ${memoriRevisi.no} sudah masuk ke keranjang. Tambah atau kurangi item, lalu selesaikan pembayaran.`,
                        'success'
                    );
                } else {
                    showAlert(
                        'Retur Selesai',
                        'Transaksi di-void. Semua item habis stok atau tidak ada di katalog — keranjang kosong.',
                        'success'
                    );
                }
            } catch (e) {
                showAlert('Gagal', e.message || 'Terjadi kesalahan saat retur.', 'error');
            }
        }
    );
}

// ─── TAB RETUR ─────────────────────────────────────────────
// Data semua transaksi untuk tab retur
var dataTabRetur = [];

async function loadTabRetur() {
    try {
        // Set default tanggal hari ini jika belum diisi
        const inputTgl = document.getElementById('filterReturTgl');
        if (inputTgl && !inputTgl.value) {
            inputTgl.value = new Date().toISOString().split('T')[0];
        }
        const res  = await fetch('/api/transaksi');
        const data = await res.json();
        dataTabRetur = Array.isArray(data) ? data : [];
        filterTabRetur();
    } catch { /* ignore */ }
}

function resetFilterRetur() {
    const inputTgl = document.getElementById('filterReturTgl');
    if (inputTgl) inputTgl.value = new Date().toISOString().split('T')[0];
    const inputCari = document.getElementById('cariStrukRetur');
    if (inputCari) inputCari.value = '';
    filterTabRetur();
}

function filterTabRetur() {
    const kw     = (document.getElementById('cariStrukRetur')?.value || '').toLowerCase();
    const tgl    = document.getElementById('filterReturTgl')?.value || new Date().toISOString().split('T')[0];
    const startDate = new Date(tgl); startDate.setHours(0,0,0,0);
    const endDate   = new Date(tgl); endDate.setHours(23,59,59,999);

    let filtered = dataTabRetur.filter(t => {
        if (!t.tanggal) return false;
        const ts = new Date(t.tanggal).getTime();
        return ts >= startDate.getTime() && ts <= endDate.getTime();
    });

    // Filter keyword — cari di no_struk dan kasir
    if (kw) {
        filtered = filtered.filter(t =>
            (t.no_struk || '').toLowerCase().includes(kw) ||
            (t.kasir    || '').toLowerCase().includes(kw)
        );
    }

    renderTabRetur(filtered);
}

function renderTabRetur(data) {
    const listEl = document.getElementById('listTabRetur');
    if (!listEl) return;

    const canReprint = hasPermission('reprint');
    const canRetur   = hasPermission('retur');

    if (!data.length) {
        listEl.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-bold">Tidak ada transaksi.</td></tr>`;
        return;
    }

    listEl.innerHTML = data.map(t => {
        const tb = parseFloat(t.total_bayar) || 0;

        // Tombol Reprint
        const btnReprint = canReprint ? `
          <button onclick="lihatDetailStruk('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')"
            class="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 active:scale-95 transition">
            🖨️ Reprint
          </button>` : '';

        // Tombol Retur
        const btnRetur = canRetur ? `
          <button onclick="lihatDetailStruk('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')"
            class="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-orange-600 active:scale-95 transition">
            ↩ Retur
          </button>` : '';

        return `
          <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-4">
              <div class="font-bold text-blue-600 font-mono text-[10px] uppercase">${t.no_struk}</div>
              <div class="text-[9px] text-slate-400 mt-0.5">${new Date(t.tanggal).toLocaleString('id-ID')}</div>
              <div class="text-[8px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded border mt-1 uppercase font-bold">
                Kasir: ${safeStr(t.kasir)||'Admin'} • ${t.metode_bayar||'TUNAI'}
              </div>
            </td>
            <td class="p-4 text-right font-black text-slate-800 text-xs">${formatRupiah(tb)}</td>
            <td class="p-4">
              <div class="flex gap-2 justify-center flex-wrap">${btnReprint}${btnRetur}</div>
            </td>
          </tr>`;
    }).join('');
}

function cetakUlangStruk(data) {
    document.getElementById('strukTanggal').innerText    = data.tanggal;
    document.getElementById('strukNomor').innerText      = data.no + ' (REPRINT)';
    document.getElementById('strukNamaKasir').innerText  = data.kasir.toUpperCase();
    document.getElementById('strukItem').innerHTML = data.items.map(i =>
        `<tr><td class="pb-1">${safeStr(i.nama_barang)}</td><td align="right" class="pb-1 font-bold">${i.qty}</td></tr>`
    ).join('');
    document.getElementById('strukTotalPrint').innerText  = formatRupiah(data.total);
    document.getElementById('strukMetodePrint').innerText = data.metode.toUpperCase();
    const isTunai = data.metode.toUpperCase() !== 'QRIS';
    document.getElementById('areaStrukTunai').classList.toggle('hidden', !isTunai);
    document.getElementById('areaStrukKembali').classList.toggle('hidden', !isTunai);
    if (isTunai) {
        document.getElementById('strukTunaiPrint').innerText   = formatRupiah(data.total);
        document.getElementById('strukKembaliPrint').innerText = 'Rp0';
    }
    doPrintAction(document.getElementById('areaStruk'), () => {});
}

function tutupModalStruk() { document.getElementById('modalStrukLaporan').classList.add('hidden'); }

function pencarianStruk() {
    const kw = (document.getElementById('cariStruk')?.value || '').toLowerCase();
    gambarTabelLaporan(dataTampilLaporan.filter(t => (t.no_struk||'').toLowerCase().includes(kw)));
}

function cetakLaporanPDF() {
    if (!dataTampilLaporan.length) return showAlert('Laporan Kosong', 'Tidak ada data untuk dicetak.', 'error');
    let o=0, m=0;
    let h = `<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;"><h2>${profilToko.nama_toko||'TOKO'}</h2><p style="font-weight:bold;">${document.getElementById('teksFilterLaporan').innerText}</p></div><table><thead><tr>`;
    if (currentLaporanType === 'harian') {
        h += `<th>Struk</th><th>Kasir/Metode</th><th>Omzet</th><th>Laba</th></tr></thead><tbody>`;
        dataTampilLaporan.forEach(t => { o+=parseFloat(t.total_bayar||0); m+=parseFloat(t.total_modal||0); h+=`<tr><td>${t.no_struk}</td><td style="text-transform:uppercase;">${safeStr(t.kasir)||'Admin'} - ${t.metode_bayar||'TUNAI'}</td><td align="right">${formatRupiah(t.total_bayar)}</td><td align="right">${formatRupiah((t.total_bayar||0)-(t.total_modal||0))}</td></tr>`; });
        h += `<tr><th colspan="2">TOTAL</th><th align="right">${formatRupiah(o)}</th><th align="right">${formatRupiah(o-m)}</th></tr>`;
    } else {
        h += `<th>Bulan</th><th align="right">Modal</th><th align="right">Omzet</th><th align="right">Laba</th></tr></thead><tbody>`;
        dataTampilLaporan.forEach(t => { o+=parseFloat(t.total_bayar||0); m+=parseFloat(t.total_modal||0); });
        const [y,mn] = document.getElementById('filterBulan').value.split('-');
        const monthName = new Date(y,mn-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
        h += `<tr><td>${monthName.toUpperCase()}</td><td align="right">${formatRupiah(m)}</td><td align="right">${formatRupiah(o)}</td><td align="right">${formatRupiah(o-m)}</td></tr>`;
    }
    h += `</tbody></table><p style="text-align:right;font-size:10px;margin-top:10px;">Dicetak: ${new Date().toLocaleString('id-ID')}</p>`;
    document.getElementById('areaPrintLaporan').innerHTML = h; doPrintAction(document.getElementById('areaPrintLaporan'), null);
}

// ─── PENGGUNA ──────────────────────────────────────────────
async function loadUsers() {
    try {
        const res = await fetch('/api/users'); const d = await res.json();
        document.getElementById('listPengguna').innerHTML = (Array.isArray(d)?d:[]).map(u => `
          <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-4 font-bold text-slate-800">${safeStr(u.username)}</td>
            <td class="p-4">${u.username==='owner'||u.role==='admin'?'<span class="text-purple-600 font-black text-[9px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">SUPER ADMIN</span>':(u.role||'').split(',').map(r=>`<span class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1 inline-block">${safeStr(r)}</span>`).join('')}</td>
            <td class="p-4 text-center">${u.username!=='owner'?`<button onclick="siapkanEditUser('${u.id}','${safeAttr(u.username)}','${safeAttr(u.role)}')" class="text-blue-600 font-bold mr-4 text-[10px] uppercase hover:underline">Edit</button><button onclick="hapusUser('${u.id}','${safeAttr(u.username)}')" class="text-red-500 font-bold text-[10px] uppercase hover:underline">Hapus</button>`:'<span class="text-slate-300 text-[10px] italic font-bold">LOCKED</span>'}</td>
          </tr>`).join('');
    } catch { /* ignore */ }
}

function siapkanEditUser(id, username, role) {
    document.getElementById('addUserId').value = id; document.getElementById('addUserUsername').value = username; document.getElementById('addUserUsername').disabled = true; document.getElementById('addUserUsername').classList.add('opacity-50');
    document.getElementById('addUserPassword').value = '';
    const arrRole = (role||'').split(',');
    document.querySelectorAll('.akses-cb').forEach(cb => { cb.checked = arrRole.includes(cb.value) || cb.value==='kasir' || ['owner','admin'].includes(role); });
    isEditUserMode = true; document.getElementById('btnSimpanUser').innerText = 'Update Akun'; document.getElementById('btnSimpanUser').classList.replace('bg-blue-600','bg-orange-500'); document.getElementById('btnBatalEditUser').classList.remove('hidden');
}
function batalEditUser() {
    document.getElementById('addUserId').value=''; document.getElementById('addUserUsername').value=''; document.getElementById('addUserUsername').disabled=false; document.getElementById('addUserUsername').classList.remove('opacity-50'); document.getElementById('addUserPassword').value='';
    document.querySelectorAll('.akses-cb').forEach(cb => { cb.checked = cb.value==='kasir'; });
    isEditUserMode = false; document.getElementById('btnSimpanUser').innerText = 'Simpan Akun'; document.getElementById('btnSimpanUser').classList.replace('bg-orange-500','bg-blue-600'); document.getElementById('btnBatalEditUser').classList.add('hidden');
}
async function simpanUser() {
    const u = document.getElementById('addUserUsername').value.replace(/\s+/g,''); const p = document.getElementById('addUserPassword').value;
    const r = Array.from(document.querySelectorAll('.akses-cb:checked')).map(x=>x.value).join(',');
    if (!u) return showAlert('Peringatan', 'Username tidak boleh kosong.', 'error');
    if (!isEditUserMode && !p) return showAlert('Peringatan', 'Password wajib diisi.', 'error');
    try {
        const res = await fetch(isEditUserMode?`/api/users/${document.getElementById('addUserId').value}`:'/api/users', { method: isEditUserMode?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p,role:r}) });
        // FIX #6: cek res.ok — status 500 dari duplikat username sekarang terdeteksi
        if (!res.ok) throw new Error('server error');
        const rd = await res.json();
        if (!rd.success) throw new Error(rd.pesan || 'gagal');
        showAlert('Sukses', 'Akun berhasil disimpan.', 'success'); batalEditUser(); loadUsers();
    } catch { showAlert('Error', 'Username mungkin sudah terpakai.', 'error'); }
}
async function hapusUser(id, name) {
    if (name === localStorage.getItem('userName')) return showAlert('Ditolak', 'Tidak bisa menghapus akun sendiri.', 'error');
    if (name === 'owner') return showAlert('Ditolak', 'Akun owner tidak bisa dihapus.', 'error');
    showConfirm('Hapus Akun?', `Cabut akses untuk "${name}"?`, async () => {
        try { await fetch('/api/users/'+id,{method:'DELETE'}); loadUsers(); showAlert('Terhapus','Akun berhasil dihapus.','success'); }
        catch { /* ignore */ }
    });
}

// ─── INIT ─────────────────────────────────────────────────
// FIX #1: semua DOM listener dipasang di sini, setelah DOM siap — tidak lagi di root scope
// FIX #5: closeConfirm() DULU baru callback — supaya modal tidak overlap
window.onload = function () {
    document.getElementById('btnConfirmOk').onclick = function () {
        const cb = confirmCallback;
        confirmCallback = null;
        closeConfirm();   // FIX #5: tutup dulu
        if (cb) cb();     // baru jalankan callback
    };
    checkAuth();
};