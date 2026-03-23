// ============================================================
// POSweb by Rsby — app.js
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
var chartOmzetInstance       = null;
var chartTerlarisInstance    = null;
var chartPerbandinganInstance = null;
var metodeBayarActive  = 'Tunai';
var isEditMode         = false;
var isEditUserMode     = false;
var semuaTransaksi     = [];
var dataTampilLaporan  = [];
var memoriRevisi       = {};
var confirmCallback    = null;
var authToken          = '';      // JWT token
var idleTimer          = null;    // auto logout timer
var IDLE_TIMEOUT_MS    = 30 * 60 * 1000; // 30 menit idle → logout
var restoreFileData    = null;
var diskonGlobalPct    = 0;      // persen diskon global dari setting
var diskonGlobalAktif  = false;  // toggle diskon global di kasir
var diskonGlobalNominal= 0;      // nominal hasil kalkulasi diskon global
var prefixStruk        = 'TRX';  // prefix nomor struk
var ppnPct             = 0;      // persentase PPN
var ppnAktif           = false;  // toggle PPN aktif
var ppnNominal         = 0;      // nominal PPN hasil kalkulasi
var ppnMode            = 'exclude'; // 'exclude' atau 'include'
var ppnMode            = 'eksklusif'; // 'eksklusif' atau 'inklusif'

// ─── UTILS ──────────────────────────────────────────────────
function safeStr(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function safeAttr(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ─── FETCH DENGAN AUTH TOKEN ──────────────────────────────
function fetchAuth(url, options = {}) {
    const token = authToken || localStorage.getItem('authToken') || '';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, { ...options, headers }).then(res => {
        if (res.status === 401 && !url.includes('/api/login') && authToken) {
            // Token expired — paksa logout (tapi tidak kalau sedang proses login)
            showAlert('Sesi Berakhir', 'Sesi kamu telah berakhir. Silakan login kembali.', 'error');
            setTimeout(() => forceLogout(), 1500);
        }
        return res;
    });
}

// ─── AUTO LOGOUT IDLE ─────────────────────────────────────
function startIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        showAlert('Sesi Berakhir', 'Kamu tidak aktif selama 30 menit. Silakan login kembali.', 'error');
        setTimeout(() => forceLogout(), 2000);
    }, IDLE_TIMEOUT_MS);
}

function resetIdleTimer() { if (authToken) startIdleTimer(); }

function forceLogout() {
    authToken = '';
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userUsername');
    clearTimeout(idleTimer);
    location.reload();
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
            mainApp.style.setProperty('display', 'flex', 'important');
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
    // Pastikan authToken selalu tersync dari localStorage
    authToken = authToken || localStorage.getItem('authToken') || '';
    try {
        const role = localStorage.getItem('userRole') || '';
        const name = localStorage.getItem('userName') || '';
        if (name && name !== 'undefined' && name !== 'null' && name !== '') {
            document.getElementById('pageLogin').style.setProperty('display', 'none', 'important');
            document.getElementById('mainApp').style.setProperty('display', 'flex', 'important');
            document.getElementById('mainApp').classList.remove('hidden');
            const userInfoEl = document.getElementById('userInfo');
            if (userInfoEl) userInfoEl.innerText = name.toUpperCase();

            const all = ['dashboard','kasir','gudang','laporan','retur','pengguna','setting','reprint','pelanggan','backup'];
            const isSuperAdmin = name === 'owner' || role === 'owner' || role === 'admin' || role.includes('dashboard') || role.includes('pengguna');
            if (isSuperAdmin) {
                currentPermissions = [...all];
            } else if (typeof role === 'string' && role.trim() !== '') {
                currentPermissions = role.split(',').filter(Boolean);
            } else {
                currentPermissions = ['kasir'];
            }
            if (!currentPermissions.includes('kasir')) currentPermissions.push('kasir');
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

            // Tampilkan/sembunyikan sub-tab Akun di Setting
            const stabAkun = document.getElementById('stab-akun');
            if (stabAkun) {
                if (isSuperAdmin || currentPermissions.includes('pengguna')) {
                    stabAkun.style.removeProperty('display');
                } else {
                    stabAkun.style.setProperty('display', 'none', 'important');
                }
            }

            // Tampilkan/sembunyikan sub-tab Backup di Setting
            const stabBackup = document.getElementById('stab-backup');
            if (stabBackup) {
                if (isSuperAdmin || currentPermissions.includes('backup')) {
                    stabBackup.style.removeProperty('display');
                } else {
                    stabBackup.style.setProperty('display', 'none', 'important');
                }
            }

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
        const res = await fetchAuth('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
        const d = await res.json();
        if (res.ok && d.success) {
            // Simpan token DULU sebelum apapun
            if (d.token) {
                authToken = d.token;
                localStorage.setItem('authToken', d.token);
            }
            localStorage.setItem('userRole',     d.role     || 'kasir');
            localStorage.setItem('userUsername', d.username || u);
            localStorage.setItem('userName',     d.username || u);
            document.getElementById('inputPass').value = '';
            startIdleTimer();
            checkAuth();
        } else { showAlert('Akses Ditolak', d.pesan || 'Username atau Password salah.', 'error'); }
    } catch { showAlert('Koneksi Gagal', 'Tidak dapat terhubung ke server.', 'error'); }
    finally { btn.innerText = 'MASUK SEKARANG'; btn.disabled = false; btn.classList.remove('opacity-50'); }
}

function logout() { localStorage.clear(); location.reload(); }

// ─── TAB SYSTEM ────────────────────────────────────────────
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
    if (t === 'pengguna')  { showTab('setting'); return; }
    if (t === 'pelanggan') loadPelangganWA();
    if (t === 'setting')   { loadUsers(); loadInfoBackup(); showSettingTab('toko'); setTimeout(initPengaturanTransaksi, 100); }
    toggleSidebar(true);
}

// ─── GUDANG ────────────────────────────────────────────────
async function loadBarang() {
    try {
        const res = await fetchAuth('/api/produk');
        const d   = await res.json();
        const arr = Array.isArray(d) ? d : [];
        let html  = '';
        arr.forEach(i => {
            const stokLabel = (i.stok || 0) <= 5
                ? `<span class="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black animate-pulse border border-red-200">${i.stok} ${safeStr(i.satuan)}</span>`
                : `<span class="font-black">${i.stok} <span class="text-[9px] text-slate-400">${safeStr(i.satuan)}</span></span>`;
            const diskonBadge = parseFloat(i.diskon||0) > 0
                ? `<span class="bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-black ml-1">${i.diskon}%</span>` : '';
            html += `<tr class="border-b hover:bg-slate-50 transition">
              <td class="p-3"><div class="font-bold text-slate-800">${safeStr(i.nama)} <span class="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ml-1 border">${safeStr(i.kategori||'-')}</span></div><div class="text-[9px] text-slate-400 font-mono mt-0.5">${safeStr(i.barcode)}</div></td>
              <td class="p-3 text-right font-bold text-slate-500">${formatRupiah(i.harga_beli)}</td>
              <td class="p-3 text-right font-black text-blue-600">${formatRupiah(i.harga_jual)}${diskonBadge}</td>
              <td class="p-3 text-center">${stokLabel}</td>
              <td class="p-3 text-center">
                <button onclick="siapkanEdit('${safeAttr(i.barcode)}','${safeAttr(i.nama)}','${i.harga_jual}','${i.stok}','${i.harga_beli}','${safeAttr(i.kategori||'-')}','${safeAttr(i.satuan||'pcs')}','${i.diskon||0}')" class="text-blue-600 font-bold hover:underline mr-3 text-[10px] uppercase">Edit</button>
                <button onclick="hapusBarang('${safeAttr(i.barcode)}')" class="text-red-500 font-bold hover:underline text-[10px] uppercase">Hapus</button>
              </td>
            </tr>`;
        });
        document.getElementById('listBarang').innerHTML = html;
        if (!isEditMode) autoNextBarcode();
    } catch(e) { console.error(e); }
}

function siapkanEdit(b, n, hj, s, hb, k, st, dk) {
    document.getElementById('addBarcode').value = b; document.getElementById('addBarcode').disabled = true; document.getElementById('addBarcode').classList.add('opacity-50');
    document.getElementById('addNama').value = n; document.getElementById('addHarga').value = hj; document.getElementById('addStok').value = s;
    document.getElementById('addHargaBeli').value = hb; document.getElementById('addKategori').value = k; document.getElementById('addSatuan').value = st;
    const elDk = document.getElementById('addDiskon'); if (elDk) elDk.value = dk || 0;
    isEditMode = true; document.getElementById('btnBatalEdit').classList.remove('hidden');
    const btn = document.getElementById('btnSimpanBarang');
    if (btn) { btn.innerText = 'Update Barang'; btn.classList.replace('bg-slate-900','bg-orange-500'); btn.classList.replace('hover:bg-black','hover:bg-orange-600'); }
}

function batalEdit() {
    ['addBarcode','addNama','addHarga','addStok','addHargaBeli','addKategori','addSatuan','addDiskon'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('addBarcode').disabled = false; document.getElementById('addBarcode').classList.remove('opacity-50');
    isEditMode = false; document.getElementById('btnBatalEdit').classList.add('hidden');
    const btn = document.getElementById('btnSimpanBarang');
    if (btn) { btn.innerText = 'Simpan Barang'; btn.classList.replace('bg-orange-500','bg-slate-900'); btn.classList.replace('hover:bg-orange-600','hover:bg-black'); }
    autoNextBarcode();
}

async function autoNextBarcode() {
    const el = document.getElementById('addBarcode');
    if (!el || isEditMode) return;
    try {
        const res  = await fetchAuth('/api/produk');
        const data = await res.json();
        const arr  = Array.isArray(data) ? data : [];
        const nums = arr
            .map(i => (i.barcode || '').trim())
            .filter(b => /^[0-9]+$/.test(b))
            .map(b => parseInt(b, 10));
        if (!nums.length) { el.value = '001'; return; }
        const next = Math.max(...nums) + 1;
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
    const dk = parseFloat(document.getElementById('addDiskon')?.value) || 0;
    if (!b || !n || !hj) return showAlert('Perhatian', 'Barcode, Nama Produk, dan Harga Jual WAJIB diisi!', 'error');
    const btn = document.getElementById('btnSimpanBarang');
    if (btn) { btn.innerText = 'MENYIMPAN...'; btn.disabled = true; btn.classList.add('opacity-50'); }
    try {
        const res = await fetch(isEditMode ? `/api/produk/${b}` : '/api/produk', {
            method: isEditMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: b, nama: n, harga_jual: hj, harga_beli: hb, stok: s, kategori: k, satuan: st, diskon: dk }),
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
        const res = await fetchAuth('/api/produk');
        const d   = await res.json();
        dataKatalog = Array.isArray(d) ? d : [];

        const cats = ['All'];
        dataKatalog.forEach(i => {
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
        const matchCat    = activeCategory === 'All' || (i.kategori||'-').toUpperCase() === activeCategory;
        return matchSearch && matchCat;
    });
    const listEl = document.getElementById('listKatalogKasir'); if (!listEl) return;
    if (!filtered.length) { listEl.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 italic text-xs font-bold">Barang tidak ditemukan</div>'; return; }
    listEl.innerHTML = filtered.map(i => {
        const diskon           = parseFloat(i.diskon) || 0;
        const hargaAfterDiskon = diskon > 0 ? Math.round(i.harga_jual * (1 - diskon / 100)) : i.harga_jual;
        const isDiskon         = diskon > 0;

        const stokNum   = parseInt(i.stok) || 0;
        const stokLabel = stokNum <= 5
            ? `<p class="text-[8px] font-bold text-red-500 animate-pulse mt-1">Sisa: ${stokNum} ${safeStr(i.satuan)}</p>`
            : `<p class="text-[8px] text-slate-400 mt-1">Stok: ${stokNum} ${safeStr(i.satuan)}</p>`;

        if (isDiskon) {
            return `<div class="bg-green-50 border border-green-300 hover:border-green-500 rounded-xl p-2 md:p-2.5 cursor-pointer active:scale-95 transition-all shadow-sm" onclick="tambahItem('${safeAttr(i.barcode)}')">
              <p class="font-bold text-[10px] md:text-[11px] uppercase truncate leading-tight text-slate-800" title="${safeStr(i.nama)}">${safeStr(i.nama)}</p>
              <p class="text-[8px] font-mono text-slate-400 mt-0.5">${safeStr(i.barcode)}</p>
              <p class="font-black text-xs md:text-sm text-green-600 mt-1">${formatRupiah(hargaAfterDiskon)} <span class="text-[8px] bg-red-500 text-white px-1 py-0.5 rounded font-black">-${diskon}%</span></p>
              <p class="text-[9px] text-slate-400 line-through">${formatRupiah(i.harga_jual)}</p>
              ${stokLabel}
            </div>`;
        } else {
            return `<div class="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-2 md:p-2.5 cursor-pointer active:scale-95 transition-all shadow-sm" onclick="tambahItem('${safeAttr(i.barcode)}')">
              <p class="font-bold text-[10px] md:text-[11px] uppercase truncate leading-tight text-slate-800" title="${safeStr(i.nama)}">${safeStr(i.nama)}</p>
              <p class="text-[8px] font-mono text-slate-400 mt-0.5">${safeStr(i.barcode)}</p>
              <p class="font-black text-xs md:text-sm text-blue-600 mt-1">${formatRupiah(i.harga_jual)}</p>
              ${stokLabel}
            </div>`;
        }
    }).join('');
}

function handleScan(e) {
    filterKatalog();
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault(); e.stopPropagation();
        const bc = document.getElementById('scanBarcode').value.trim();
        if (!bc) return;
        const item = dataKatalog.find(i => i.barcode === bc);
        if (item) { tambahItem(bc); }
        else { showAlert('Tidak Ditemukan', 'Barcode tidak terdaftar.', 'error'); }
        document.getElementById('scanBarcode').value = '';
        filterKatalog();
        document.getElementById('scanBarcode').focus();
    }
}

function tambahItem(b) {
    const item = dataKatalog.find(x => x.barcode === b);
    if (!item || item.stok <= 0) return showAlert('Stok Habis', 'Barang ini kosong.', 'error');
    const idx = keranjang.findIndex(k => k.barcode === b);
    const diskonProduk = parseFloat(item.diskon) || 0;
    const hargaSetelahDiskon = diskonProduk > 0 ? item.harga_jual * (1 - diskonProduk/100) : item.harga_jual;
    if (idx > -1) {
        if (keranjang[idx].qty + 1 > item.stok) return showAlert('Stok Kurang', 'Sisa stok tidak mencukupi.', 'error');
        keranjang[idx].qty++;
        keranjang[idx].subtotal = Math.round(keranjang[idx].qty * hargaSetelahDiskon);
    } else {
        keranjang.push({ ...item, qty: 1, diskon: diskonProduk, subtotal: Math.round(hargaSetelahDiskon), harga_beli: parseFloat(item.harga_beli || 0) });
    }
    renderKeranjang();
}

function gantiQty(idx, m) {
    keranjang[idx].qty += m;
    if (keranjang[idx].qty <= 0) { keranjang.splice(idx, 1); }
    else if (keranjang[idx].qty > keranjang[idx].stok) { showAlert('Batas Maksimal', 'Jumlah melebihi stok.', 'error'); keranjang[idx].qty--; }
    if (keranjang[idx]) {
        const diskonProduk = parseFloat(keranjang[idx].diskon) || 0;
        const hargaAfter = diskonProduk > 0 ? keranjang[idx].harga_jual * (1 - diskonProduk/100) : keranjang[idx].harga_jual;
        keranjang[idx].subtotal = Math.round(keranjang[idx].qty * hargaAfter);
    }
    renderKeranjang();
}

function renderKeranjang() {
    total = 0; totalModal = 0;
    if (!keranjang.length) {
        document.getElementById('areaKeranjang').innerHTML = '<div class="text-center py-12 text-slate-300 italic text-[11px] uppercase font-bold tracking-widest">Keranjang Kosong</div>';
        document.getElementById('totalBelanja').innerText = 'Rp0'; document.getElementById('itemCount').innerText = '0 ITEMS';
        diskonGlobalNominal = 0;
        const dBadge = document.getElementById('badgeDiskonGlobal');
        if (dBadge) dBadge.classList.add('hidden');
        if (metodeBayarActive === 'QRIS') document.getElementById('uangBayar').value = '';
        hitungKembalian(); return;
    }
    let subtotalKotor = 0;
    let html = '<table class="w-full">';
    keranjang.forEach((i, idx) => {
        // Hitung harga setelah diskon per produk
        const diskonProduk = parseFloat(i.diskon) || 0;
        const hargaSetelahDiskon = diskonProduk > 0
            ? i.harga_jual * (1 - diskonProduk / 100)
            : i.harga_jual;
        i.subtotal = Math.round(hargaSetelahDiskon * i.qty);
        subtotalKotor += i.subtotal;
        totalModal += (i.harga_beli * i.qty);
        const diskonLabel = diskonProduk > 0
            ? `<span class="text-[8px] bg-red-50 text-red-500 border border-red-200 px-1 rounded font-black ml-1">${diskonProduk}%</span>`
            : '';
        html += `<tr class="border-b hover:bg-slate-50 transition">
          <td class="py-2 px-1"><div class="font-bold text-[11px] leading-tight" title="${safeStr(i.nama)}">${safeStr(i.nama)}${diskonLabel}</div><div class="text-[9px] text-slate-400 mt-0.5">@${formatRupiah(i.harga_jual)}${diskonProduk > 0 ? ' → <span class="text-green-600 font-black">' + formatRupiah(hargaSetelahDiskon) + '</span>' : ''}</div></td>
          <td align="center"><div class="flex items-center justify-center gap-1.5 bg-slate-100 rounded-lg p-1"><button onclick="gantiQty(${idx},-1)" class="w-6 h-6 bg-white text-red-500 rounded shadow-sm font-black">-</button><span class="w-5 font-black text-[11px] text-center">${i.qty}</span><button onclick="gantiQty(${idx},1)" class="w-6 h-6 bg-white text-blue-600 rounded shadow-sm font-black">+</button></div></td>
          <td align="right" class="font-black text-[11px]">${formatRupiah(i.subtotal)}</td>
        </tr>`;
    });
    html += '</table>';
    // Hitung diskon global
    diskonGlobalNominal = 0;
    const dBadge = document.getElementById('badgeDiskonGlobal');
    if (diskonGlobalAktif && diskonGlobalPct > 0) {
        diskonGlobalNominal = Math.round(subtotalKotor * diskonGlobalPct / 100);
        if (dBadge) { dBadge.innerText = 'Diskon ' + diskonGlobalPct + '% = -' + formatRupiah(diskonGlobalNominal); dBadge.classList.remove('hidden'); }
    } else {
        if (dBadge) dBadge.classList.add('hidden');
    }
    // Hitung PPN berdasarkan mode exclude/include
    ppnNominal = 0;
    const baseAfterDiskon = subtotalKotor - diskonGlobalNominal;
    const badgePPN = document.getElementById('badgePPNKeranjang');
    if (ppnAktif && ppnPct > 0) {
        if (ppnMode === 'include') {
            // Harga sudah include PPN — ekstrak: PPN = Total × pct / (100 + pct)
            ppnNominal = Math.round(baseAfterDiskon * ppnPct / (100 + ppnPct));
            if (badgePPN) { badgePPN.innerText = 'PPN ' + ppnPct + '% (include) = ' + formatRupiah(ppnNominal) + ' sudah termasuk'; badgePPN.classList.remove('hidden'); }
        } else {
            // Exclude: PPN ditambahkan di atas harga
            ppnNominal = Math.round(baseAfterDiskon * ppnPct / 100);
            if (badgePPN) { badgePPN.innerText = 'PPN ' + ppnPct + '% (exclude) = +' + formatRupiah(ppnNominal); badgePPN.classList.remove('hidden'); }
        }
    } else {
        if (badgePPN) badgePPN.classList.add('hidden');
    }
    // Include: total tidak berubah (PPN sudah di dalam). Exclude: total naik sebesar PPN.
    total = ppnMode === 'include' ? baseAfterDiskon : baseAfterDiskon + ppnNominal;    // total bertambah PPN
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
    const no = prefixStruk + '-' + Date.now(); const kasir = localStorage.getItem('userName') || 'Admin';
    try {
        const res = await fetchAuth('/api/transaksi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ no_struk: no, total_bayar: total, total_modal: totalModal, diskon_nominal: diskonGlobalNominal, ppn_nominal: ppnNominal, ppn_mode: ppnMode, keranjang, kasir, metode_bayar: metodeBayarActive }) });
        if (!res.ok) throw new Error('Server error');
        document.getElementById('strukTanggal').innerText   = new Date().toLocaleString('id-ID');
        document.getElementById('strukNomor').innerText     = no;
        document.getElementById('strukNamaKasir').innerText = kasir.toUpperCase();
        document.getElementById('strukItem').innerHTML = keranjang.map(i => `
            <tr><td class="pb-0.5" colspan="2"><span class="font-bold">${safeStr(i.nama)}</span></td></tr>
            <tr><td class="pb-1.5 text-[9px] pl-1 text-slate-500">${i.qty} x ${formatRupiah(i.harga_jual)}</td><td class="pb-1.5 text-right font-bold">${formatRupiah(i.subtotal)}</td></tr>`).join('');
        // Render diskon per produk di struk
        const diskonProdukRows = keranjang.filter(i => parseFloat(i.diskon||0) > 0);
        const areaDskProduk = document.getElementById('areaStrukDiskonProduk');
        if (areaDskProduk) {
            if (diskonProdukRows.length > 0) {
                areaDskProduk.innerHTML = diskonProdukRows.map(i =>
                    '<div class="flex justify-between text-[9px] text-green-700"><span>Diskon ' + safeStr(i.nama).slice(0,12) + ' (' + i.diskon + '%)</span><span>-' + formatRupiah(Math.round(i.harga_jual * i.qty * i.diskon / 100)) + '</span></div>'
                ).join('');
            } else { areaDskProduk.innerHTML = ''; }
        }
        // Render diskon global di struk
        const areaDskGlobal = document.getElementById('areaStrukDiskonGlobal');
        if (areaDskGlobal) {
            if (diskonGlobalNominal > 0) {
                const subtotalKotor = total + diskonGlobalNominal;
                document.getElementById('strukSubtotalPrint').innerText = formatRupiah(subtotalKotor);
                document.getElementById('strukDiskonLabel').innerText   = 'DISKON ' + diskonGlobalPct + '%';
                document.getElementById('strukDiskonPrint').innerText   = '-' + formatRupiah(diskonGlobalNominal);
                areaDskGlobal.classList.remove('hidden');
            } else { areaDskGlobal.classList.add('hidden'); }
        }
        // Render PPN di struk thermal
        const areaPPN = document.getElementById('areaStrukPPN');
        if (areaPPN) {
            if (ppnNominal > 0) {
                document.getElementById('strukPPNLabel').innerText = 'PPN ' + ppnPct + '%';
                document.getElementById('strukPPNPrint').innerText = '+' + formatRupiah(ppnNominal);
                areaPPN.classList.remove('hidden');
            } else { areaPPN.classList.add('hidden'); }
        }
        document.getElementById('strukTotalPrint').innerText  = formatRupiah(total);
        document.getElementById('strukMetodePrint').innerText = metodeBayarActive.toUpperCase();
        const isTunai = metodeBayarActive === 'Tunai';
        document.getElementById('areaStrukTunai').classList.toggle('hidden', !isTunai);
        document.getElementById('areaStrukKembali').classList.toggle('hidden', !isTunai);
        if (isTunai) { document.getElementById('strukTunaiPrint').innerText = formatRupiah(b); document.getElementById('strukKembaliPrint').innerText = formatRupiah(b - total); }
        const trxResult = await res.json();
        lastTrxData = { no, total, bayar: b, kembali: b - total, items: [...keranjang], metode: metodeBayarActive, kasir, id_transaksi: trxResult.id_transaksi, diskon_nominal: diskonGlobalNominal, ppn_nominal: ppnNominal, ppnPct: ppnPct, ppnMode: ppnMode };
        document.getElementById('modalKembalian').innerText = formatRupiah(b - total);
        document.getElementById('modalSuksesBayar').classList.remove('hidden');
    } catch { showAlert('Koneksi Gagal', 'Gagal memproses transaksi.', 'error'); }
}

function cetakStrukKasir() {
    document.getElementById('modalSuksesBayar').classList.add('hidden');
    doPrintAction(document.getElementById('areaStruk'), () => document.getElementById('modalSuksesBayar').classList.remove('hidden'));
}

function kirimWA() {
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
    if (!nomor) { document.getElementById('inputNomorWA').focus(); document.getElementById('inputNomorWA').classList.add('ring-2', 'ring-red-400'); return; }
    document.getElementById('inputNomorWA').classList.remove('ring-2', 'ring-red-400');
    if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);
    else if (!nomor.startsWith('62')) nomor = '62' + nomor;
    if (lastTrxData.id_transaksi) {
        fetchAuth('/api/transaksi/wa/' + lastTrxData.id_transaksi, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wa_pelanggan: nomor }) }).catch(() => {});
    }
    let t = '';
    t += '*' + (profilToko.nama_toko || 'Toko') + '*\n';
    if (profilToko.alamat_toko) t += profilToko.alamat_toko + '\n';
    if (profilToko.telp_toko)   t += 'Telp: ' + profilToko.telp_toko + '\n';
    t += '\nNo Struk : *' + lastTrxData.no + '*\n';
    t += 'Tanggal  : ' + new Date().toLocaleString('id-ID') + '\n';
    t += 'Kasir    : ' + (lastTrxData.kasir || 'Admin') + '\n';
    t += '\n--------------------------------\n';
    lastTrxData.items.forEach(function(i) { t += i.nama + '\n  ' + i.qty + ' x ' + formatRupiah(i.harga_jual) + ' = ' + formatRupiah(i.qty * i.harga_jual) + '\n'; });
    t += '--------------------------------\n*TOTAL    : ' + formatRupiah(lastTrxData.total) + '*\nMetode   : ' + lastTrxData.metode.toUpperCase() + '\n';
    if (lastTrxData.metode === 'Tunai') { t += 'Bayar    : ' + formatRupiah(lastTrxData.bayar) + '\nKembali  : ' + formatRupiah(lastTrxData.kembali) + '\n'; }
    t += '\n_Terima kasih sudah berbelanja!_ 🙏';
    closeModalWA();
    window.open('https://wa.me/' + nomor + '?text=' + encodeURIComponent(t), '_blank');
}

function selesaiBayar() {
    document.getElementById('modalSuksesBayar').classList.add('hidden');
    keranjang = []; total = 0; totalModal = 0; diskonGlobalNominal = 0; ppnNominal = 0;
    document.getElementById('uangBayar').value = '';
    pilihMetode('Tunai'); renderKeranjang(); loadKatalogKasir(); loadDataLaporan();
}

// ─── DASHBOARD ─────────────────────────────────────────────
async function loadDashboard() {
    try {
        const [resTx, resPr, resTr] = await Promise.all([fetchAuth('/api/transaksi'), fetchAuth('/api/produk'), fetchAuth('/api/terlaris')]);
        const [txData, prData, trData] = await Promise.all([resTx.json(), resPr.json(), resTr.json()]);
        const allTx = Array.isArray(txData) ? txData : [];
        const allPr = Array.isArray(prData) ? prData : [];

        // ── Tanggal helper ──────────────────────────────────────────
        const today     = new Date();
        const todayStr  = today.toISOString().split('T')[0];
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const yesterStr = yesterday.toISOString().split('T')[0];

        // ── 7 hari ini & 7 hari lalu ────────────────────────────────
        const last7Labels = [], omzet7Ini = [], omzet7Lalu = [];
        let omzetHariIni = 0, labaHariIni = 0, omzetKemarin = 0;
        let trxHariIni = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dLaluStr = new Date(d.getTime() - 7 * 86400000).toISOString().split('T')[0];

            last7Labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));

            const txIni  = allTx.filter(t => t.tanggal?.startsWith(dStr));
            const txLalu = allTx.filter(t => t.tanggal?.startsWith(dLaluStr));
            const oIni   = txIni.reduce((s, t) => s + parseFloat(t.total_bayar || 0), 0);
            const oLalu  = txLalu.reduce((s, t) => s + parseFloat(t.total_bayar || 0), 0);
            omzet7Ini.push(oIni);
            omzet7Lalu.push(oLalu);

            if (i === 0) {
                omzetHariIni = oIni;
                omzetKemarin = allTx.filter(t => t.tanggal?.startsWith(yesterStr)).reduce((s, t) => s + parseFloat(t.total_bayar || 0), 0);
                labaHariIni  = txIni.reduce((s, t) => s + (parseFloat(t.total_bayar||0) - parseFloat(t.total_modal||0) - parseFloat(t.ppn_nominal||0)), 0);
                trxHariIni   = txIni;
            }
        }

        // ── Kartu Omzet + perbandingan vs kemarin ───────────────────
        document.getElementById('dashOmzetHariIni').innerText = formatRupiah(omzetHariIni);
        const vsKemarinEl = document.getElementById('dashOmzetVsKemarin');
        if (vsKemarinEl) {
            if (omzetKemarin === 0 && omzetHariIni === 0) {
                vsKemarinEl.innerText = '';
            } else if (omzetKemarin === 0) {
                vsKemarinEl.innerHTML = '<span class="text-green-500">↑ Kemarin Rp0</span>';
            } else {
                const pct = ((omzetHariIni - omzetKemarin) / omzetKemarin * 100).toFixed(1);
                const naik = omzetHariIni >= omzetKemarin;
                vsKemarinEl.innerHTML = '<span class="' + (naik ? 'text-green-500' : 'text-red-400') + '">' +
                    (naik ? '↑' : '↓') + ' ' + Math.abs(pct) + '% vs kemarin</span>';
            }
        }

        // ── Kartu Laba + jumlah transaksi ───────────────────────────
        document.getElementById('dashLabaHariIni').innerText = formatRupiah(labaHariIni);
        const trxEl = document.getElementById('dashTrxHariIni');
        if (trxEl) trxEl.innerText = trxHariIni.length + ' transaksi hari ini';

        // ── Kartu Produk ─────────────────────────────────────────────
        document.getElementById('dashTotalProduk').innerText = allPr.length;
        const prodDiskonEl = document.getElementById('dashProdukDiskon');
        const jmlDiskon = allPr.filter(p => parseFloat(p.diskon||0) > 0).length;
        if (prodDiskonEl) prodDiskonEl.innerText = jmlDiskon > 0 ? jmlDiskon + ' produk promo' : '';

        // ── Kartu Stok ───────────────────────────────────────────────
        document.getElementById('dashTotalStok').innerText = allPr.reduce((s, p) => s + parseInt(p.stok || 0), 0);
        const batasStok = 5;
        const stokRendah = allPr.filter(p => parseInt(p.stok||0) <= batasStok);
        const stokRendahEl = document.getElementById('dashStokRendah');
        if (stokRendahEl) stokRendahEl.innerText = stokRendah.length > 0 ? stokRendah.length + ' produk stok rendah' : '';

        // ── Notifikasi alert stok hampir habis ──────────────────────
        const alertBox  = document.getElementById('alertStokHabis');
        const alertList = document.getElementById('alertStokList');
        const alertCount = document.getElementById('alertStokCount');
        if (alertBox && alertList) {
            if (stokRendah.length > 0) {
                alertBox.classList.remove('hidden');
                if (alertCount) alertCount.innerText = stokRendah.length;
                alertList.innerHTML = stokRendah.map(p =>
                    '<span class="bg-red-100 border border-red-200 text-red-700 text-[9px] font-black px-2 py-1 rounded-lg">' +
                    p.nama + ' <span class="opacity-60">(' + p.stok + ' ' + (p.satuan||'pcs') + ')</span></span>'
                ).join('');
            } else {
                alertBox.classList.add('hidden');
            }
        }

        // ── Transaksi Terakhir Hari Ini ──────────────────────────────
        const trxTerakhirEl = document.getElementById('dashTrxTerakhir');
        const jmlTrxEl      = document.getElementById('dashJmlTrx');
        if (jmlTrxEl) jmlTrxEl.innerText = trxHariIni.length + ' transaksi';
        if (trxTerakhirEl) {
            const last5 = [...trxHariIni].reverse().slice(0, 5);
            if (last5.length === 0) {
                trxTerakhirEl.innerHTML = '<div class="px-4 py-6 text-center text-slate-300 text-xs font-bold italic">Belum ada transaksi hari ini</div>';
            } else {
                trxTerakhirEl.innerHTML = last5.map(t => {
                    const laba = (parseFloat(t.total_bayar||0) - parseFloat(t.total_modal||0) - parseFloat(t.ppn_nominal||0));
                    const jam  = new Date(t.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    return '<div class="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">' +
                        '<div>' +
                            '<div class="text-[10px] font-black text-blue-600 font-mono">' + t.no_struk + '</div>' +
                            '<div class="text-[9px] text-slate-400 font-semibold">' + jam + ' · ' + (t.kasir||'Admin') + ' · ' + (t.metode_bayar||'TUNAI') + '</div>' +
                        '</div>' +
                        '<div class="text-right">' +
                            '<div class="text-xs font-black text-slate-800">' + formatRupiah(t.total_bayar) + '</div>' +
                            '<div class="text-[9px] font-bold text-green-600">Laba ' + formatRupiah(laba) + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
        }

        // ── Charts ──────────────────────────────────────────────────
        if (typeof Chart !== 'undefined') {
            // Chart trend 7 hari
            if (chartOmzetInstance) chartOmzetInstance.destroy();
            chartOmzetInstance = new Chart(document.getElementById('chartOmzet').getContext('2d'), {
                type: 'line',
                data: { labels: last7Labels, datasets: [{ label: 'Omzet', data: omzet7Ini, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => 'Rp' + (v >= 1000000 ? (v/1000000).toFixed(1)+'jt' : v >= 1000 ? (v/1000).toFixed(0)+'rb' : v), font: { size: 8 } }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { size: 8 } } } } }
            });

            // Chart terlaris
            if (chartTerlarisInstance) chartTerlarisInstance.destroy();
            const topData = Array.isArray(trData) ? trData : [];
            chartTerlarisInstance = new Chart(document.getElementById('chartTerlaris').getContext('2d'), {
                type: 'bar',
                data: { labels: topData.map(d => d.nama_barang), datasets: [{ label: 'Terjual', data: topData.map(d => d.total_qty), backgroundColor: '#16a34a', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 8 }, maxRotation: 30 } }, y: { ticks: { font: { size: 8 } }, grid: { color: '#f1f5f9' } } } }
            });

            // Chart perbandingan minggu ini vs minggu lalu
            if (chartPerbandinganInstance) chartPerbandinganInstance.destroy();
            chartPerbandinganInstance = new Chart(document.getElementById('chartPerbandingan').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: last7Labels,
                    datasets: [
                        { label: 'Minggu Ini',  data: omzet7Ini,  backgroundColor: 'rgba(37,99,235,0.8)',  borderRadius: 4 },
                        { label: 'Minggu Lalu', data: omzet7Lalu, backgroundColor: 'rgba(148,163,184,0.5)', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'jt' : v >= 1000 ? (v/1000).toFixed(0)+'rb' : v, font: { size: 8 } }, grid: { color: '#f1f5f9' } },
                        x: { ticks: { font: { size: 8 } } }
                    }
                }
            });

            // Ringkasan perbandingan
            const totalIni  = omzet7Ini.reduce((s, v) => s + v, 0);
            const totalLalu = omzet7Lalu.reduce((s, v) => s + v, 0);
            const ringkasanEl = document.getElementById('ringkasanPerbandingan');
            if (ringkasanEl) {
                if (totalLalu === 0) {
                    ringkasanEl.innerText = 'Minggu ini total ' + formatRupiah(totalIni);
                } else {
                    const pct  = ((totalIni - totalLalu) / totalLalu * 100).toFixed(1);
                    const naik = totalIni >= totalLalu;
                    ringkasanEl.innerHTML = 'Minggu ini <b>' + formatRupiah(totalIni) + '</b> vs minggu lalu <b>' + formatRupiah(totalLalu) + '</b> ' +
                        '<span class="' + (naik ? 'text-green-600' : 'text-red-500') + ' font-black">' + (naik ? '↑' : '↓') + ' ' + Math.abs(pct) + '%</span>';
                }
            }
        }
    } catch(e) { console.error('loadDashboard error:', e); }
}

// ─── SETTING ───────────────────────────────────────────────

// Sub-tab navigasi di dalam Setting
function showSettingTab(name) {
    // Toggle stab button style
    document.querySelectorAll('.setting-stab').forEach(b => {
        b.className = b.className.replace('stab-active','stab-inactive');
    });
    const activeBtn = document.getElementById('stab-' + name);
    if (activeBtn) {
        activeBtn.className = activeBtn.className.replace('stab-inactive','stab-active');
    }
    // Sembunyikan semua panel
    document.querySelectorAll('.setting-panel').forEach(p => p.classList.add('hidden'));
    // Tampilkan panel yang dipilih
    const panel = document.getElementById('spanel-' + name);
    if (panel) panel.classList.remove('hidden');
}

async function loadPengaturan() {
    try {
        const res = await fetchAuth('/api/pengaturan'); const d = await res.json();
        if (d) {
            profilToko = d;
            document.getElementById('setNamaToko').value  = d.nama_toko   || '';
            document.getElementById('setAlamat').value    = d.alamat_toko || '';
            document.getElementById('setTelp').value      = d.telp_toko   || '';
            document.getElementById('headerNamaToko').innerText     = d.nama_toko   || 'POSweb by Rsby';
            document.getElementById('headerAlamatTelp').innerText   = `${d.alamat_toko||''} | Telp: ${d.telp_toko||''}`;
            document.getElementById('strukNamaTokoPrint').innerText  = d.nama_toko   || '';
            document.getElementById('strukAlamatTelpPrint').innerText= d.alamat_toko || '';
            // Prefix struk
            prefixStruk = (d.prefix_struk || 'TRX').toUpperCase();
            const elPrefix = document.getElementById('setPrefixStruk');
            if (elPrefix) elPrefix.value = prefixStruk;
            // Diskon global
            diskonGlobalPct = parseFloat(d.diskon_global) || 0;
            diskonGlobalAktif = !!(d.diskon_global_aktif);
            // PPN
            ppnPct   = parseFloat(d.ppn_pct) || 0;
            ppnAktif = !!(d.ppn_aktif);
            ppnMode  = d.ppn_mode || 'eksklusif';
            const elPPNPct   = document.getElementById('setPPNPct');
            const elPPNAktif = document.getElementById('setPPNAktif');
            if (elPPNPct)   elPPNPct.value    = ppnPct || 11;
            if (elPPNAktif) elPPNAktif.checked = ppnAktif;
            // Set radio button mode PPN
            const radios = document.querySelectorAll('input[name="ppnMode"]');
            radios.forEach(r => { r.checked = r.value === ppnMode; });
            updateStylePPNMode();
            const elDiskonPct = document.getElementById('setDiskonGlobal');
            if (elDiskonPct) elDiskonPct.value = diskonGlobalPct;
            const elDiskonAktif = document.getElementById('setDiskonGlobalAktif');
            if (elDiskonAktif) elDiskonAktif.checked = diskonGlobalAktif;
            // Tampilkan tombol diskon di kasir jika ada diskon global
            const btnToggle = document.getElementById('btnToggleDiskon');
            if (btnToggle) {
                if (diskonGlobalPct > 0) {
                    btnToggle.classList.remove('hidden');
                    updateTombolDiskon();
                } else {
                    btnToggle.classList.add('hidden');
                }
            }
        }
        const kertas = localStorage.getItem('ukuranKertas') || '58mm';
        const footer  = localStorage.getItem('footerStruk')  || 'Terima Kasih';
        const selKertas = document.getElementById('setUkuranKertas');
        if (selKertas) selKertas.value = kertas;
        document.querySelectorAll('input[name="ukuranKertas"]').forEach(r => { r.checked = r.value === kertas; });
        const footerEl = document.getElementById('setFooterStruk');
        if (footerEl) footerEl.value = footer;
        document.getElementById('strukFooterText').innerText = footer;
        const areaStruk = document.getElementById('areaStruk');
        if (kertas === '80mm') areaStruk.classList.replace('max-w-[58mm]', 'max-w-[80mm]');
        else areaStruk.classList.replace('max-w-[80mm]', 'max-w-[58mm]');
    } catch(e) { console.error(e); }
    // Load logo secara terpisah (bisa besar, jangan block UI)
    loadLogo();
    // Load jam operasional
    loadJamOperasional();
}


// ─── LOGO TOKO ─────────────────────────────────────────────

async function loadLogo() {
    try {
        const res  = await fetchAuth('/api/pengaturan/logo');
        const data = await res.json();
        applyLogo(data.logo_toko || null);
    } catch(e) { console.error('loadLogo error', e); }
}

function applyLogo(base64) {
    // Header app
    const headerLogo = document.getElementById('headerLogoToko');
    if (headerLogo) {
        if (base64) { headerLogo.src = base64; headerLogo.classList.remove('hidden'); }
        else         { headerLogo.src = ''; headerLogo.classList.add('hidden'); }
    }
    // Struk cetak
    const strukLogo = document.getElementById('strukLogoPrint');
    if (strukLogo) {
        if (base64) { strukLogo.src = base64; strukLogo.style.display = 'block'; }
        else         { strukLogo.src = ''; strukLogo.style.display = 'none'; }
    }
    // Preview di setting
    const preview     = document.getElementById('logoPreview');
    const placeholder = document.getElementById('logoPlaceholder');
    const btnHapus    = document.getElementById('btnHapusLogo');
    if (preview && placeholder) {
        if (base64) {
            preview.src = base64;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            if (btnHapus) btnHapus.classList.remove('hidden');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
            if (btnHapus) btnHapus.classList.add('hidden');
        }
    }
    // Simpan ke profilToko global
    profilToko.logo_toko = base64;
}

function previewLogo(input) {
    const file = input.files[0];
    if (!file) return;
    // Validasi ukuran maks 2MB
    if (file.size > 2 * 1024 * 1024) {
        showAlert('File Terlalu Besar', 'Ukuran gambar maksimal 2MB. Kompres dulu sebelum upload.', 'error');
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        // Tampilkan preview sementara
        const preview     = document.getElementById('logoPreview');
        const placeholder = document.getElementById('logoPlaceholder');
        if (preview)     { preview.src = base64; preview.classList.remove('hidden'); }
        if (placeholder) { placeholder.classList.add('hidden'); }
        // Aktifkan tombol simpan
        const btnSimpan = document.getElementById('btnSimpanLogo');
        if (btnSimpan) { btnSimpan.disabled = false; btnSimpan.dataset.logo = base64; }
    };
    reader.readAsDataURL(file);
}

async function simpanLogo() {
    const btnSimpan = document.getElementById('btnSimpanLogo');
    const base64    = btnSimpan ? btnSimpan.dataset.logo : null;
    if (!base64) return showAlert('Pilih Gambar', 'Pilih gambar logo terlebih dahulu.', 'error');

    btnSimpan.disabled = true;
    btnSimpan.innerText = 'MENYIMPAN...';
    try {
        const res = await fetchAuth('/api/pengaturan/logo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logo_toko: base64 })
        });
        const d = await res.json();
        if (res.ok && d.success) {
            applyLogo(base64);
            showAlert('Sukses', 'Logo toko berhasil disimpan!', 'success');
            btnSimpan.dataset.logo = '';
            const btnHapus = document.getElementById('btnHapusLogo');
            if (btnHapus) btnHapus.classList.remove('hidden');
            // Reset file input
            const inputEl = document.getElementById('inputLogoToko');
            if (inputEl) inputEl.value = '';
        } else {
            showAlert('Gagal', 'Gagal menyimpan logo.', 'error');
        }
    } catch(e) {
        showAlert('Gagal', 'Koneksi ke server terputus.', 'error');
    } finally {
        btnSimpan.disabled = false;
        btnSimpan.innerText = 'Simpan Logo';
    }
}

async function hapusLogo() {
    showConfirm('Hapus Logo?', 'Logo toko akan dihapus. Lanjutkan?', async () => {
        try {
            await fetchAuth('/api/pengaturan/logo', { method: 'DELETE' });
            applyLogo(null);
            // Reset file input dan tombol simpan
            const inputEl   = document.getElementById('inputLogoToko');
            const btnSimpan = document.getElementById('btnSimpanLogo');
            if (inputEl)  inputEl.value = '';
            if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.dataset.logo = ''; }
            showAlert('Terhapus', 'Logo toko berhasil dihapus.', 'success');
        } catch(e) {
            showAlert('Gagal', 'Koneksi ke server terputus.', 'error');
        }
    });
}


// ─── JAM OPERASIONAL ───────────────────────────────────────

var HARI_LIST = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
var jamData   = {}; // { Senin: { buka: true, dari: '08:00', sampai: '21:00' }, ... }

// Default jam — semua hari buka 08:00-21:00
function jamDefault() {
    var d = {};
    HARI_LIST.forEach(function(h) {
        d[h] = { buka: true, dari: '08:00', sampai: '21:00' };
    });
    return d;
}

async function loadJamOperasional() {
    try {
        var res  = await fetchAuth('/api/pengaturan/jam');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        if (data.jam_operasional) {
            var parsed;
            try {
                parsed = typeof data.jam_operasional === 'string'
                    ? JSON.parse(data.jam_operasional)
                    : data.jam_operasional;
            } catch(pe) {
                console.warn('jam_operasional parse error, reset ke default', pe);
                parsed = null;
            }
            if (parsed) {
                jamData = parsed.data || parsed;
                var aktif = parsed.aktif !== undefined ? parsed.aktif : true;
                applyJamUI(aktif);
            } else {
                jamData = jamDefault();
                applyJamUI(false);
            }
        } else {
            jamData = jamDefault();
            applyJamUI(false);
        }
        applyJamStruk();
    } catch(e) {
        console.error('loadJam error', e);
        jamData = jamDefault();
        applyJamUI(false);
    }
}

function applyJamUI(aktif) {
    var toggle   = document.getElementById('jamAktif');
    var body     = document.getElementById('jamBody');
    var infoEl   = document.getElementById('jamNonaktifInfo');
    if (toggle)  toggle.checked = aktif;
    if (body)    body.classList.toggle('hidden', !aktif);
    if (infoEl)  infoEl.classList.toggle('hidden', aktif);
    renderJamRows();
}

function toggleJamAktif() {
    var toggle = document.getElementById('jamAktif');
    applyJamUI(toggle ? toggle.checked : false);
    applyJamStruk();
}

function renderJamRows() {
    var container = document.getElementById('jamRows');
    if (!container) return;
    container.innerHTML = HARI_LIST.map(function(hari) {
        var d = jamData[hari] || { buka: true, dari: '08:00', sampai: '21:00' };
        return '<div class="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border">' +
            '<div class="w-16 shrink-0">' +
                '<label class="flex items-center gap-1.5 cursor-pointer">' +
                    '<input type="checkbox" id="jam_buka_' + hari + '" ' + (d.buka ? 'checked' : '') + ' class="accent-blue-600" onchange="onJamChange()">' +
                    '<span class="text-[11px] font-black text-slate-700 uppercase">' + hari.slice(0,3) + '</span>' +
                '</label>' +
            '</div>' +
            '<div id="jam_row_' + hari + '" class="flex items-center gap-1.5 flex-grow ' + (!d.buka ? 'opacity-30 pointer-events-none' : '') + '">' +
                '<input type="time" id="jam_dari_' + hari + '" value="' + (d.dari || '08:00') + '" class="flex-1 p-1.5 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-white" onchange="onJamChange()">' +
                '<span class="text-[10px] font-black text-slate-400">–</span>' +
                '<input type="time" id="jam_sampai_' + hari + '" value="' + (d.sampai || '21:00') + '" class="flex-1 p-1.5 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-white" onchange="onJamChange()">' +
            '</div>' +
            '<div class="w-16 text-right">' +
                '<span id="jam_tutup_' + hari + '" class="text-[10px] font-black text-red-400 uppercase' + (!d.buka ? '' : ' hidden') + '">Tutup</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

function onJamChange() {
    HARI_LIST.forEach(function(hari) {
        var cbEl    = document.getElementById('jam_buka_' + hari);
        var rowEl   = document.getElementById('jam_row_' + hari);
        var tutupEl = document.getElementById('jam_tutup_' + hari);
        var buka    = cbEl ? cbEl.checked : true;
        if (rowEl)   rowEl.classList.toggle('opacity-30', !buka);
        if (rowEl)   rowEl.classList.toggle('pointer-events-none', !buka);
        if (tutupEl) tutupEl.classList.toggle('hidden', buka);
        jamData[hari] = {
            buka:   buka,
            dari:   (document.getElementById('jam_dari_' + hari) || {}).value   || '08:00',
            sampai: (document.getElementById('jam_sampai_' + hari) || {}).value || '21:00'
        };
    });
    applyJamStruk();
}

function setJamPreset(preset) {
    var defaults = { dari: '08:00', sampai: '21:00' };
    HARI_LIST.forEach(function(hari, idx) {
        var buka = true;
        if (preset === 'senin-jumat' && idx >= 5) buka = false;
        if (preset === 'senin-sabtu' && idx >= 6) buka = false;
        jamData[hari] = { buka: buka, dari: defaults.dari, sampai: defaults.sampai };
    });
    renderJamRows();
    applyJamStruk();
}

async function simpanJamOperasional() {
    var toggle = document.getElementById('jamAktif');
    var aktif  = toggle ? toggle.checked : false;

    // Sync langsung dari input DOM ke jamData — tanpa onJamChange()
    // supaya tidak ada side effect render ulang
    HARI_LIST.forEach(function(hari) {
        var cbEl    = document.getElementById('jam_buka_' + hari);
        var dariEl  = document.getElementById('jam_dari_' + hari);
        var sampaiEl= document.getElementById('jam_sampai_' + hari);
        jamData[hari] = {
            buka:   cbEl    ? cbEl.checked          : true,
            dari:   dariEl  ? (dariEl.value   || '08:00') : '08:00',
            sampai: sampaiEl? (sampaiEl.value  || '21:00') : '21:00'
        };
    });

    var payload = { aktif: aktif, data: jamData };

    var btn = document.querySelector('[onclick="simpanJamOperasional()"]');
    if (btn) { btn.innerText = 'MENYIMPAN...'; btn.disabled = true; }

    try {
        var bodyStr = JSON.stringify({ jam_operasional: JSON.stringify(payload) });
        var res = await fetchAuth('/api/pengaturan/jam', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: bodyStr
        });
        if (!res.ok) {
            var errText = await res.text();
            throw new Error('Server error: ' + errText);
        }
        var d = await res.json();
        if (d.success) {
            applyJamStruk();
            showAlert('Sukses', 'Jam operasional berhasil disimpan!', 'success');
        } else {
            showAlert('Gagal', d.pesan || 'Gagal menyimpan jam operasional.', 'error');
        }
    } catch(e) {
        console.error('[simpanJam]', e);
        showAlert('Gagal', e.message || 'Koneksi ke server terputus.', 'error');
    } finally {
        if (btn) { btn.innerText = 'Simpan Jam Operasional'; btn.disabled = false; }
    }
}

// Terapkan ke elemen struk dan profilToko
function applyJamStruk() {
    var toggle    = document.getElementById('jamAktif');
    var aktif     = toggle ? toggle.checked : false;
    var strukEl   = document.getElementById('strukJamPrint');
    if (!strukEl) return;
    if (!aktif)   { strukEl.style.display = 'none'; strukEl.innerText = ''; return; }

    // Buat teks ringkas jam operasional
    var lines = [];
    // Kelompokkan hari berurutan dengan jam sama
    var prev = null;
    var grpStart = null;
    function flushGroup(endHari) {
        if (!grpStart) return;
        var d = jamData[grpStart];
        if (!d || !d.buka) { prev = null; grpStart = null; return; }
        var label = grpStart === endHari ? grpStart : grpStart.slice(0,3) + '-' + endHari.slice(0,3);
        lines.push(label + ': ' + d.dari + '-' + d.sampai);
        prev = null; grpStart = null;
    }
    HARI_LIST.forEach(function(hari, idx) {
        var d = jamData[hari] || { buka: false };
        if (!d.buka) { flushGroup(HARI_LIST[idx-1] || hari); return; }
        var same = prev && prev.buka && prev.dari === d.dari && prev.sampai === d.sampai;
        if (!same) { if (grpStart) flushGroup(HARI_LIST[idx-1] || hari); grpStart = hari; }
        prev = d;
        if (idx === HARI_LIST.length - 1) flushGroup(hari);
    });

    var txt = lines.join(' | ');
    strukEl.innerText = txt ? ('Jam: ' + txt) : '';
    strukEl.style.display = txt ? 'block' : 'none';
    profilToko.jam_text = txt ? ('Jam: ' + txt) : '';
}

async function simpanPengaturan() {
    const d = {
        nama_toko:          document.getElementById('setNamaToko').value,
        alamat_toko:        document.getElementById('setAlamat').value,
        telp_toko:          document.getElementById('setTelp').value,
        prefix_struk:       (document.getElementById('setPrefixStruk')?.value || 'TRX').toUpperCase().replace(/[^A-Z0-9\-_]/g,'').slice(0,10),
        diskon_global:      parseFloat(document.getElementById('setDiskonGlobal')?.value) || 0,
        diskon_global_aktif: document.getElementById('setDiskonGlobalAktif')?.checked ? 1 : 0
    };
    try { await fetchAuth('/api/pengaturan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); showAlert('Sukses', 'Profil Toko tersimpan.', 'success'); loadPengaturan(); }
    catch { showAlert('Gagal', 'Gagal menyimpan pengaturan.', 'error'); }
}

function simpanPengaturanPrinter() {
    // Ambil dari radio button jika ada, fallback ke select
    const radioChecked = document.querySelector('input[name="ukuranKertas"]:checked');
    const kertas = radioChecked ? radioChecked.value : (document.getElementById('setUkuranKertas')?.value || '58mm');
    const footer = document.getElementById('setFooterStruk').value;
    localStorage.setItem('ukuranKertas', kertas); localStorage.setItem('footerStruk', footer);
    // Sync hidden select
    const selKertas = document.getElementById('setUkuranKertas');
    if (selKertas) selKertas.value = kertas;
    document.getElementById('strukFooterText').innerText = footer || 'Terima Kasih';
    const areaStruk = document.getElementById('areaStruk');
    if (kertas === '80mm') areaStruk.classList.replace('max-w-[58mm]', 'max-w-[80mm]'); else areaStruk.classList.replace('max-w-[80mm]', 'max-w-[58mm]');
    showAlert('Sukses', 'Pengaturan printer tersimpan.', 'success');
}
// Alias dari tombol baru di HTML
function simpanPengaturanPrinterBaru() { simpanPengaturanPrinter(); }

// ─── LAPORAN ───────────────────────────────────────────────
async function loadDataLaporan() {
    try { const res = await fetchAuth('/api/transaksi'); const d = await res.json(); semuaTransaksi = Array.isArray(d) ? d : []; renderLaporan(currentLaporanType || 'harian'); }
    catch { semuaTransaksi = []; renderLaporan('harian'); }
}

function renderLaporan(tipe) {
    currentLaporanType = tipe;
    document.querySelectorAll('.btn-filter-lap').forEach(b => { b.classList.remove('bg-green-600','text-white'); b.classList.add('bg-gray-200','text-gray-700'); });
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
    let o = 0, m = 0, totalPPN = 0; const list = document.getElementById('listLaporan'); const thead = document.getElementById('theadLaporan'); list.innerHTML = '';
    if (currentLaporanType === 'harian') {
        if (thead) thead.innerHTML = '<th class="p-4">Struk / Kasir</th><th class="p-4 text-right">Netto</th><th class="p-4 text-right">PPN</th><th class="p-4 text-right">Total</th><th class="p-4 text-center">Audit</th>';
        if (!data?.length) { list.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic font-bold">Data kosong.</td></tr>`; }
        else { data.forEach(t => {
            const tb   = parseFloat(t.total_bayar)||0;
            const tm   = parseFloat(t.total_modal)||0;
            const tppn = parseFloat(t.ppn_nominal)||0;
            // Netto = total_bayar dikurangi PPN eksklusif (atau total_bayar jika inklusif PPN sudah di dalamnya)
            const netto = tb - (ppnMode === 'eksklusif' ? tppn : 0);
            o += tb; m += tm; totalPPN += tppn;
            const ppnCell = tppn > 0
                ? `<div class="font-bold text-violet-600 text-xs">${formatRupiah(tppn)}</div>`
                : `<div class="text-slate-300 text-xs">—</div>`;
            list.innerHTML += `<tr class="border-b hover:bg-slate-50 transition">
              <td class="p-4"><div class="font-bold text-blue-600 font-mono text-[10px] uppercase">${t.no_struk}</div><div class="text-[9px] text-slate-400 font-bold mt-0.5">${new Date(t.tanggal).toLocaleString('id-ID')}</div><div class="text-[8px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded border mt-1 uppercase font-bold">Kasir: ${safeStr(t.kasir)||'Admin'} • ${t.metode_bayar||'TUNAI'}</div></td>
              <td class="p-4 text-right"><div class="font-bold text-slate-800 text-xs">${formatRupiah(netto)}</div><div class="text-[9px] text-green-600 font-black mt-0.5">Laba: ${formatRupiah(netto-tm)}</div></td>
              <td class="p-4 text-right">${ppnCell}</td>
              <td class="p-4 text-right"><div class="font-black text-slate-800 text-xs">${formatRupiah(tb)}</div></td>
              <td class="p-4 text-center"><button onclick="lihatDetailStruk('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')" class="bg-slate-100 border text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 shadow-sm active:scale-95">Audit</button></td>
            </tr>`;
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
    // totalPPN sudah dihitung di loop atas (let totalPPN = 0 di baris pertama)
    document.getElementById('lapOmzet').innerText = formatRupiah(o);
    document.getElementById('lapModal').innerText = formatRupiah(m);
    document.getElementById('lapLaba').innerText  = formatRupiah(o - m - totalPPN);


    // Tampilkan/sembunyikan card PPN berdasarkan SETTING ppnAktif, bukan nilai data
    const cardPPNEl = document.getElementById('cardPPN');
    const gridEl    = document.getElementById('gridKartuLaporan');
    const elPPN     = document.getElementById('lapPPN');
    if (ppnAktif && ppnPct > 0) {
        // PPN setting ON — tampilkan card, grid jadi 2x2 di mobile / 4 kolom di desktop
        if (cardPPNEl) cardPPNEl.classList.remove('hidden');
        if (gridEl)    { gridEl.classList.remove('grid-cols-3'); gridEl.classList.add('grid-cols-2'); gridEl.classList.remove('md:grid-cols-3'); gridEl.classList.add('md:grid-cols-4'); }
        if (elPPN)     elPPN.innerText = totalPPN > 0 ? formatRupiah(totalPPN) : 'Rp0';
    } else {
        // PPN setting OFF — sembunyikan card, grid kembali 3 kolom
        if (cardPPNEl) cardPPNEl.classList.add('hidden');
        if (gridEl)    { gridEl.classList.add('grid-cols-3'); gridEl.classList.remove('grid-cols-2'); gridEl.classList.add('md:grid-cols-3'); gridEl.classList.remove('md:grid-cols-4'); }
    }
}

// ─── PERMISSION HELPER ────────────────────────────────────
function hasPermission(p) {
    const role = localStorage.getItem('userRole') || '';
    if (['owner','admin'].includes(role) || role.includes('dashboard')) return true;
    return currentPermissions.includes(p);
}

// ─── AUDIT MODAL ───────────────────────────────────────────
async function lihatDetailStruk(id, no, tgl, tot, kas, metode) {
    try {
        const res = await fetchAuth('/api/transaksi/detail/' + id);
        const d   = await res.json();
        memoriRevisi = { id, no, tanggal: tgl, total: tot, kasir: kas, metode, items: d };
        let h = `<div class="mb-3 text-center border-b pb-3"><div class="font-black text-sm uppercase text-slate-800">${safeStr(profilToko.nama_toko||'')}</div><div class="text-[9px] font-bold text-slate-400 mt-1">${new Date(tgl).toLocaleString('id-ID')}</div><div class="text-[10px] bg-blue-50 text-blue-600 inline-block px-2 py-0.5 rounded font-mono font-bold mt-1 border border-blue-100">${no}</div><div class="text-[9px] font-bold text-slate-500 mt-1 uppercase">Kasir: ${safeStr(kas)} • ${safeStr(metode)}</div></div><table class="w-full text-xs mb-3"><tbody class="divide-y divide-slate-100 border-t border-b">`;
        d.forEach(i => { h += `<tr><td class="py-2"><div class="font-bold text-slate-700">${safeStr(i.nama_barang)}</div><div class="text-[9px] text-slate-400">@${formatRupiah(i.harga)}</div></td><td class="py-2 text-center text-[10px] font-bold text-blue-600">x${i.qty}</td><td class="py-2 text-right font-black text-slate-800 text-[11px]">${formatRupiah(i.subtotal)}</td></tr>`; });
        h += `</tbody></table><div class="flex justify-between font-black text-sm pt-1 text-slate-800 border-t mt-1 pt-2"><span>TOTAL</span><span class="text-blue-600">${formatRupiah(tot)}</span></div>`;
        document.getElementById('isiModalStruk').innerHTML = h;
        const reprintData = JSON.stringify({ no, tanggal: new Date(tgl).toLocaleString('id-ID'), kasir: kas, metode, total: tot, items: d, diskon_nominal: 0, diskonPct: '' });
        const showReprint = hasPermission('reprint');
        const showRetur   = hasPermission('retur');
        const btnReprint  = showReprint ? `<button onclick='cetakUlangStruk(${reprintData})' class="w-full bg-blue-500 text-white font-bold py-3 text-sm rounded-xl hover:bg-blue-600 active:scale-95 transition uppercase tracking-widest mb-2">Cetak Ulang Struk</button>` : '';
        const btnUnduhPDF = `<button onclick='unduhStrukPDFDariData(${reprintData})' class="w-full bg-slate-800 text-white font-bold py-3 text-sm rounded-xl hover:bg-slate-900 active:scale-95 transition uppercase tracking-widest mb-2">Unduh PDF Struk</button>`;
        const btnRetur = showRetur ? `<button onclick="returKeKasir()" class="w-full bg-orange-500 text-white font-bold py-3 text-sm rounded-xl hover:bg-orange-600 active:scale-95 transition uppercase tracking-widest mb-2">Retur — Edit &amp; Bayar Ulang</button>` : '';
        document.getElementById('modalStrukActions').innerHTML = btnReprint + btnUnduhPDF + btnRetur + `<button onclick="tutupModalStruk()" class="w-full bg-slate-100 text-slate-600 font-bold py-2.5 text-sm rounded-xl hover:bg-slate-200 transition">Tutup</button>`;
        document.getElementById('modalStrukLaporan').classList.remove('hidden');
    } catch { showAlert('Error', 'Gagal memuat rincian transaksi.', 'error'); }
}

async function returKeKasir() {
    tutupModalStruk();
    showConfirm('Retur Transaksi?', `Struk ${memoriRevisi.no} akan di-void. Item-itemnya otomatis masuk ke keranjang kasir.`, async () => {
        try {
            const delRes = await fetchAuth('/api/transaksi/' + memoriRevisi.id, { method: 'DELETE' });
            if (!delRes.ok) throw new Error('Gagal void transaksi');
            await loadKatalogKasir();
            keranjang = []; total = 0; totalModal = 0; diskonGlobalNominal = 0; ppnNominal = 0;
            memoriRevisi.items.forEach(item => {
                const katalogItem = dataKatalog.find(k => k.barcode === item.barcode);
                const qty = parseInt(item.qty) || 1;
                if (katalogItem) {
                    keranjang.push({ barcode: katalogItem.barcode, nama: katalogItem.nama, harga_jual: parseFloat(katalogItem.harga_jual), harga_beli: parseFloat(katalogItem.harga_beli || 0), stok: parseInt(katalogItem.stok) + qty, satuan: katalogItem.satuan || 'pcs', kategori: katalogItem.kategori || '-', qty, subtotal: qty * parseFloat(katalogItem.harga_jual) });
                } else {
                    keranjang.push({ barcode: item.barcode, nama: item.nama_barang, harga_jual: parseFloat(item.harga), harga_beli: 0, stok: qty, satuan: 'pcs', kategori: '-', qty, subtotal: qty * parseFloat(item.harga) });
                }
            });
            loadDataLaporan(); showTab('kasir'); renderKeranjang();
            showAlert('Retur Berhasil', `${keranjang.length} item dari struk ${memoriRevisi.no} sudah masuk ke keranjang.`, 'success');
        } catch (e) { showAlert('Gagal', e.message || 'Terjadi kesalahan saat retur.', 'error'); }
    });
}

// ─── TAB RETUR ─────────────────────────────────────────────
var dataTabRetur = [];

async function loadTabRetur() {
    try {
        const inputTgl = document.getElementById('filterReturTgl');
        if (inputTgl && !inputTgl.value) inputTgl.value = new Date().toISOString().split('T')[0];
        const res  = await fetchAuth('/api/transaksi');
        const data = await res.json();
        dataTabRetur = Array.isArray(data) ? data : [];
        filterTabRetur();
    } catch { }
}

function resetFilterRetur() {
    const inputTgl = document.getElementById('filterReturTgl');
    if (inputTgl) inputTgl.value = new Date().toISOString().split('T')[0];
    const inputCari = document.getElementById('cariStrukRetur');
    if (inputCari) inputCari.value = '';
    filterTabRetur();
}

function filterTabRetur() {
    const kw  = (document.getElementById('cariStrukRetur')?.value || '').toLowerCase();
    const tgl = document.getElementById('filterReturTgl')?.value || new Date().toISOString().split('T')[0];
    const startDate = new Date(tgl); startDate.setHours(0,0,0,0);
    const endDate   = new Date(tgl); endDate.setHours(23,59,59,999);
    let filtered = dataTabRetur.filter(t => { if (!t.tanggal) return false; const ts = new Date(t.tanggal).getTime(); return ts >= startDate.getTime() && ts <= endDate.getTime(); });
    if (kw) filtered = filtered.filter(t => (t.no_struk||'').toLowerCase().includes(kw) || (t.kasir||'').toLowerCase().includes(kw));
    renderTabRetur(filtered);
}

function renderTabRetur(data) {
    const listEl = document.getElementById('listTabRetur');
    if (!listEl) return;
    const canReprint = hasPermission('reprint');
    const canRetur   = hasPermission('retur');
    if (!data.length) { listEl.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-bold">Tidak ada transaksi.</td></tr>`; return; }
    listEl.innerHTML = data.map(t => {
        const tb = parseFloat(t.total_bayar) || 0;
        const btnReprint = canReprint ? `<button onclick="langungReprint('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')" class="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 active:scale-95 transition">Reprint</button>` : '';
        const btnUnduhPDFRetur = `<button onclick="langungUnduhPDF('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')" class="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-slate-900 active:scale-95 transition">Unduh PDF</button>`;
        const btnRetur = canRetur ? `<button onclick="langsungRetur('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${safeStr(t.kasir)||'Admin'}','${t.metode_bayar||'TUNAI'}')" class="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-orange-600 active:scale-95 transition">Retur</button>` : '';
        return `<tr class="border-b hover:bg-slate-50 transition"><td class="p-4"><div class="font-bold text-blue-600 font-mono text-[10px] uppercase">${t.no_struk}</div><div class="text-[9px] text-slate-400 mt-0.5">${new Date(t.tanggal).toLocaleString('id-ID')}</div><div class="text-[8px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded border mt-1 uppercase font-bold">Kasir: ${safeStr(t.kasir)||'Admin'} • ${t.metode_bayar||'TUNAI'}</div></td><td class="p-4 text-right font-black text-slate-800 text-xs">${formatRupiah(tb)}</td><td class="p-4"><div class="flex gap-2 justify-center flex-wrap">${btnReprint}${btnUnduhPDFRetur}${btnRetur}</div></td></tr>`;
    }).join('');
}

async function langungReprint(id, no, tgl, tot, kas, metode) {
    try {
        const res = await fetchAuth('/api/transaksi/detail/' + id);
        const d   = await res.json();
        cetakUlangStruk({ no, tanggal: new Date(tgl).toLocaleString('id-ID'), kasir: kas, metode, total: tot, items: d });
    } catch { showAlert('Error', 'Gagal memuat data struk.', 'error'); }
}

async function langsungRetur(id, no, tgl, tot, kas, metode) {
    try {
        const res = await fetchAuth('/api/transaksi/detail/' + id);
        const d   = await res.json();
        memoriRevisi = { id, no, tanggal: tgl, total: tot, kasir: kas, metode, items: d };
        showConfirm('Retur Transaksi?', `Struk ${no} akan di-void. Item-itemnya otomatis masuk ke keranjang kasir.`, async () => {
            try {
                const delRes = await fetchAuth('/api/transaksi/' + id, { method: 'DELETE' });
                if (!delRes.ok) throw new Error('Gagal void transaksi');
                await loadKatalogKasir();
                keranjang = []; total = 0; totalModal = 0; diskonGlobalNominal = 0; ppnNominal = 0;
                memoriRevisi.items.forEach(item => {
                    const katalogItem = dataKatalog.find(k => k.barcode === item.barcode);
                    const qty = parseInt(item.qty) || 1;
                    if (katalogItem) { keranjang.push({ barcode: katalogItem.barcode, nama: katalogItem.nama, harga_jual: parseFloat(katalogItem.harga_jual), harga_beli: parseFloat(katalogItem.harga_beli || 0), stok: parseInt(katalogItem.stok) + qty, satuan: katalogItem.satuan || 'pcs', kategori: katalogItem.kategori || '-', qty, subtotal: qty * parseFloat(katalogItem.harga_jual) }); }
                    else { keranjang.push({ barcode: item.barcode, nama: item.nama_barang, harga_jual: parseFloat(item.harga), harga_beli: 0, stok: qty, satuan: 'pcs', kategori: '-', qty, subtotal: qty * parseFloat(item.harga) }); }
                });
                loadDataLaporan(); showTab('kasir'); renderKeranjang();
                showAlert('Retur Berhasil', `${keranjang.length} item dari struk ${no} sudah masuk ke keranjang.`, 'success');
            } catch (e) { showAlert('Gagal', e.message || 'Terjadi kesalahan saat retur.', 'error'); }
        });
    } catch { showAlert('Error', 'Gagal memuat data transaksi.', 'error'); }
}

function cetakUlangStruk(data) {
    document.getElementById('strukTanggal').innerText    = data.tanggal;
    document.getElementById('strukNomor').innerText      = data.no + ' (REPRINT)';
    document.getElementById('strukNamaKasir').innerText  = data.kasir.toUpperCase();
    document.getElementById('strukItem').innerHTML = data.items.map(i => `<tr><td class="pb-0.5" colspan="2"><span class="font-bold">${safeStr(i.nama_barang)}</span></td></tr><tr><td class="pb-1.5 text-[9px] pl-1 text-slate-500">${i.qty} x ${formatRupiah(i.harga)}</td><td class="pb-1.5 text-right font-bold">${formatRupiah(i.subtotal)}</td></tr>`).join('');
    document.getElementById('strukTotalPrint').innerText  = formatRupiah(data.total);
    document.getElementById('strukMetodePrint').innerText = data.metode.toUpperCase();
    const isTunai = data.metode.toUpperCase() !== 'QRIS';
    document.getElementById('areaStrukTunai').classList.toggle('hidden', !isTunai);
    document.getElementById('areaStrukKembali').classList.toggle('hidden', !isTunai);
    if (isTunai) { document.getElementById('strukTunaiPrint').innerText = formatRupiah(data.total); document.getElementById('strukKembaliPrint').innerText = 'Rp0'; }
    doPrintAction(document.getElementById('areaStruk'), () => {});
}

function tutupModalStruk() { document.getElementById('modalStrukLaporan').classList.add('hidden'); }

function pencarianStruk() {
    const kw = (document.getElementById('cariStruk')?.value || '').toLowerCase();
    gambarTabelLaporan(dataTampilLaporan.filter(t => (t.no_struk||'').toLowerCase().includes(kw)));
}

function cetakLaporanPDF() {
    if (!dataTampilLaporan.length) return showAlert('Laporan Kosong', 'Tidak ada data untuk dicetak.', 'error');
    let o = 0, m = 0, totalPPNPDF = 0;

    // Header laporan
    let h = `<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;">
        <h2 style="margin:0 0 4px;">${profilToko.nama_toko||'TOKO'}</h2>
        ${profilToko.alamat_toko ? `<p style="margin:0;font-size:11px;">${profilToko.alamat_toko}</p>` : ''}
        ${profilToko.telp_toko ? `<p style="margin:0;font-size:11px;">Telp: ${profilToko.telp_toko}</p>` : ''}
        <p style="font-weight:bold;margin:6px 0 0;">${document.getElementById('teksFilterLaporan').innerText}</p>
    </div><table><thead><tr>`;

    if (currentLaporanType === 'harian') {
        h += `<th>No Struk</th><th>Kasir / Metode</th><th align="right">PPN</th><th align="right">Omzet</th><th align="right">Laba Bersih</th></tr></thead><tbody>`;
        dataTampilLaporan.forEach(t => {
            const tb   = parseFloat(t.total_bayar)  || 0;
            const tm   = parseFloat(t.total_modal)  || 0;
            const tppn = parseFloat(t.ppn_nominal)  || 0;
            const laba = tb - tm - tppn;
            o += tb; m += tm; totalPPNPDF += tppn;
            const ppnCell = tppn > 0
                ? `<span style="color:#2563eb;font-weight:700;">${formatRupiah(tppn)}</span>`
                : `<span style="color:#ccc;">—</span>`;
            h += `<tr>
                <td style="font-family:monospace;font-size:10px;">${t.no_struk}</td>
                <td style="text-transform:uppercase;font-size:10px;">${safeStr(t.kasir)||'Admin'} · ${t.metode_bayar||'TUNAI'}</td>
                <td align="right">${ppnCell}</td>
                <td align="right">${formatRupiah(tb)}</td>
                <td align="right">${formatRupiah(laba)}</td>
            </tr>`;
        });
        h += `<tr style="font-weight:bold;border-top:2px solid #000;">
            <td colspan="2">TOTAL (${dataTampilLaporan.length} transaksi)</td>
            <td align="right" style="color:#2563eb;">${totalPPNPDF > 0 ? formatRupiah(totalPPNPDF) : '—'}</td>
            <td align="right">${formatRupiah(o)}</td>
            <td align="right">${formatRupiah(o - m - totalPPNPDF)}</td>
        </tr>`;
    } else {
        h += `<th>Periode</th><th align="right">Modal</th><th align="right">PPN</th><th align="right">Omzet</th><th align="right">Laba Bersih</th></tr></thead><tbody>`;
        dataTampilLaporan.forEach(t => {
            o += parseFloat(t.total_bayar) || 0;
            m += parseFloat(t.total_modal) || 0;
            totalPPNPDF += parseFloat(t.ppn_nominal) || 0;
        });
        const [y, mn] = document.getElementById('filterBulan').value.split('-');
        const monthName = new Date(y, mn-1, 1).toLocaleDateString('id-ID', {month:'long', year:'numeric'});
        h += `<tr>
            <td><strong>${monthName.toUpperCase()}</strong><br><span style="font-size:10px;color:#666;">${dataTampilLaporan.length} transaksi</span></td>
            <td align="right">${formatRupiah(m)}</td>
            <td align="right" style="color:#2563eb;font-weight:700;">${totalPPNPDF > 0 ? formatRupiah(totalPPNPDF) : '—'}</td>
            <td align="right">${formatRupiah(o)}</td>
            <td align="right">${formatRupiah(o - m - totalPPNPDF)}</td>
        </tr>`;
    }

    // Summary box di bawah tabel
    const labaBersih = o - m - totalPPNPDF;
    h += `</tbody></table>
    <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc;">
        <table style="width:100%;border-collapse:collapse;border:none;">
            <tr>
                <td style="padding:4px 8px;border:none;font-size:11px;color:#64748b;font-weight:600;">OMZET</td>
                <td style="padding:4px 8px;border:none;font-size:13px;font-weight:800;text-align:right;color:#2563eb;">${formatRupiah(o)}</td>
                <td style="padding:4px 8px;border:none;font-size:11px;color:#64748b;font-weight:600;">MODAL</td>
                <td style="padding:4px 8px;border:none;font-size:13px;font-weight:800;text-align:right;">${formatRupiah(m)}</td>
            </tr>
            <tr>
                <td style="padding:4px 8px;border:none;font-size:11px;color:#2563eb;font-weight:600;">TOTAL PPN</td>
                <td style="padding:4px 8px;border:none;font-size:13px;font-weight:800;text-align:right;color:#2563eb;">${totalPPNPDF > 0 ? formatRupiah(totalPPNPDF) : '—'}</td>
                <td style="padding:4px 8px;border:none;font-size:11px;color:#16a34a;font-weight:600;">LABA BERSIH</td>
                <td style="padding:4px 8px;border:none;font-size:13px;font-weight:800;text-align:right;color:#16a34a;">${formatRupiah(labaBersih)}</td>
            </tr>
        </table>
    </div>
    ${totalPPNPDF > 0 ? `<p style="font-size:10px;color:#2563eb;margin-top:8px;font-weight:600;">* Total PPN ${formatRupiah(totalPPNPDF)} perlu disetor ke negara (tidak termasuk laba toko)</p>` : ''}
    <p style="text-align:right;font-size:10px;color:#94a3b8;margin-top:8px;">Dicetak: ${new Date().toLocaleString('id-ID')}</p>`;

    document.getElementById('areaPrintLaporan').innerHTML = h;
    doPrintAction(document.getElementById('areaPrintLaporan'), null);
}

// ─── PENGGUNA ──────────────────────────────────────────────
async function loadUsers() {
    try {
        const res = await fetchAuth('/api/users'); const d = await res.json();
        document.getElementById('listPengguna').innerHTML = (Array.isArray(d)?d:[]).map(u => `
          <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-4 font-bold text-slate-800">${safeStr(u.username)}</td>
            <td class="p-4">${u.username==='owner'||u.role==='admin'?'<span class="text-purple-600 font-black text-[9px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">SUPER ADMIN</span>':(u.role||'').split(',').map(r=>`<span class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1 inline-block">${safeStr(r)}</span>`).join('')}</td>
            <td class="p-4 text-center">${u.username!=='owner'?`<button onclick="siapkanEditUser('${u.id}','${safeAttr(u.username)}','${safeAttr(u.role)}')" class="text-blue-600 font-bold mr-4 text-[10px] uppercase hover:underline">Edit</button><button onclick="hapusUser('${u.id}','${safeAttr(u.username)}')" class="text-red-500 font-bold text-[10px] uppercase hover:underline">Hapus</button>`:'<span class="text-slate-300 text-[10px] italic font-bold">LOCKED</span>'}</td>
          </tr>`).join('');
    } catch { }
}

function siapkanEditUser(id, username, role) {
    document.getElementById('addUserId').value = id; document.getElementById('addUserUsername').value = username;
    document.getElementById('addUserUsername').disabled = true; document.getElementById('addUserUsername').classList.add('opacity-50');
    document.getElementById('addUserPassword').value = '';
    const arrRole = (role||'').split(',');
    document.querySelectorAll('.akses-cb').forEach(cb => { cb.checked = arrRole.includes(cb.value) || cb.value==='kasir' || ['owner','admin'].includes(role); });
    isEditUserMode = true; document.getElementById('btnSimpanUser').innerText = 'Update Akun';
    document.getElementById('btnSimpanUser').classList.replace('bg-blue-600','bg-orange-500');
    document.getElementById('btnBatalEditUser').classList.remove('hidden');
}
function batalEditUser() {
    document.getElementById('addUserId').value=''; document.getElementById('addUserUsername').value='';
    document.getElementById('addUserUsername').disabled=false; document.getElementById('addUserUsername').classList.remove('opacity-50');
    document.getElementById('addUserPassword').value='';
    document.querySelectorAll('.akses-cb').forEach(cb => { cb.checked = cb.value==='kasir'; });
    isEditUserMode = false; document.getElementById('btnSimpanUser').innerText = 'Simpan Akun';
    document.getElementById('btnSimpanUser').classList.replace('bg-orange-500','bg-blue-600');
    document.getElementById('btnBatalEditUser').classList.add('hidden');
}
async function simpanUser() {
    const u = document.getElementById('addUserUsername').value.replace(/\s+/g,'');
    const p = document.getElementById('addUserPassword').value;
    const r = Array.from(document.querySelectorAll('.akses-cb:checked')).map(x=>x.value).join(',');
    if (!u) return showAlert('Peringatan', 'Username tidak boleh kosong.', 'error');
    if (!isEditUserMode && !p) return showAlert('Peringatan', 'Password wajib diisi.', 'error');
    try {
        const res = await fetch(isEditUserMode?`/api/users/${document.getElementById('addUserId').value}`:'/api/users', { method: isEditUserMode?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p,role:r}) });
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
        try { await fetchAuth('/api/users/'+id,{method:'DELETE'}); loadUsers(); showAlert('Terhapus','Akun berhasil dihapus.','success'); }
        catch { }
    });
}

// ─── PELANGGAN WA ──────────────────────────────────────────
var dataPelangganWA = [];

async function loadPelangganWA() {
    try {
        const res  = await fetchAuth('/api/pelanggan-wa');
        const data = await res.json();
        dataPelangganWA = Array.isArray(data) ? data : [];
        filterPelangganWA();
    } catch(e) {
        document.getElementById('listPelangganWA').innerHTML = '<tr><td colspan="4" class="p-6 text-center text-red-400 italic font-bold">Gagal memuat data.</td></tr>';
    }
}

function filterPelangganWA() {
    const kw = (document.getElementById('cariPelangganWA')?.value || '').toLowerCase();
    const filtered = dataPelangganWA.filter(t => (t.wa_pelanggan||'').includes(kw) || (t.no_struk||'').toLowerCase().includes(kw) || (t.kasir||'').toLowerCase().includes(kw));
    renderPelangganWA(filtered);
}

function renderPelangganWA(data) {
    const el = document.getElementById('listPelangganWA');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400 italic font-bold">Tidak ada data.</td></tr>'; return; }
    const grouped = {};
    data.forEach(t => {
        const no = t.wa_pelanggan;
        if (!grouped[no]) grouped[no] = { wa: no, transaksi: [], total: 0 };
        grouped[no].transaksi.push(t);
        grouped[no].total += parseFloat(t.total_bayar || 0);
    });
    el.innerHTML = Object.values(grouped).map(p => {
        p.transaksi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        const latest  = p.transaksi[0];
        const jumlah  = p.transaksi.length;
        const display = p.wa.startsWith('62') ? '0' + p.wa.slice(2) : p.wa;
        const waLink  = `https://wa.me/${p.wa}`;
        return `<tr class="border-b hover:bg-slate-50 transition"><td class="p-4"><div class="font-black text-slate-800 text-sm">${display}</div><div class="text-[9px] text-slate-400 mt-0.5">${jumlah} transaksi</div></td><td class="p-4"><div class="font-bold text-blue-600 font-mono text-[10px]">${safeStr(latest.no_struk)}</div><div class="text-[9px] text-slate-400 mt-0.5">${new Date(latest.tanggal).toLocaleString('id-ID')}</div><div class="text-[8px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded border mt-1 uppercase font-bold">Kasir: ${safeStr(latest.kasir)||'Admin'}</div></td><td class="p-4 text-right font-black text-slate-800 text-xs">${formatRupiah(p.total)}</td><td class="p-4 text-center"><a href="${waLink}" target="_blank" class="inline-block bg-green-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-green-600 active:scale-95 transition">Chat WA</a></td></tr>`;
    }).join('');
}

function eksporPelangganWA() {
    if (!dataPelangganWA.length) return showAlert('Kosong', 'Tidak ada data untuk diekspor.', 'error');
    const grouped = {};
    dataPelangganWA.forEach(t => {
        const no = t.wa_pelanggan;
        if (!grouped[no]) grouped[no] = { wa: no, transaksi: [], total: 0 };
        grouped[no].transaksi.push(t);
        grouped[no].total += parseFloat(t.total_bayar || 0);
    });
    let csv = 'No WA,Jumlah Transaksi,Total Belanja,Struk Terakhir,Tanggal Terakhir\n';
    Object.values(grouped).forEach(p => {
        p.transaksi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        const latest  = p.transaksi[0];
        const display = p.wa.startsWith('62') ? '0' + p.wa.slice(2) : p.wa;
        csv += `${display},${p.transaksi.length},${p.total},${latest.no_struk},${new Date(latest.tanggal).toLocaleString('id-ID')}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'pelanggan_wa_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click(); URL.revokeObjectURL(url);
}



function updatePreviewPPN() {
    const pct    = parseFloat(document.getElementById('setPPNPct')?.value) || 0;
    const mode   = document.querySelector('input[name="ppnMode"]:checked')?.value || 'exclude';
    const aktif  = document.getElementById('setPPNAktif')?.checked;
    const box    = document.getElementById('boxPreviewPPN');
    const isi    = document.getElementById('isiPreviewPPN');
    if (!box || !isi) return;
    if (!aktif || pct <= 0) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const contoh = 100000;
    if (mode === 'exclude') {
        const ppn   = Math.round(contoh * pct / 100);
        const total = contoh + ppn;
        isi.innerHTML = 'Harga jual <b>Rp100.000</b> + PPN ' + pct + '% (Rp' + ppn.toLocaleString('id-ID') + ') = Total bayar <b>Rp' + total.toLocaleString('id-ID') + '</b><br>Laba dihitung dari harga sebelum PPN.';
    } else {
        const ppn  = Math.round(contoh * pct / (100 + pct));
        const base = contoh - ppn;
        isi.innerHTML = 'Harga jual <b>Rp100.000</b> sudah include PPN ' + pct + '% → PPN diekstrak <b>Rp' + ppn.toLocaleString('id-ID') + '</b><br>Harga dasar: Rp' + base.toLocaleString('id-ID') + ' · Laba dihitung dari harga dasar.';
    }
}

// ─── PENGATURAN TRANSAKSI ──────────────────────────────────


function updateStylePPNMode() {
    var mode = (document.querySelector('input[name="ppnMode"]:checked') || {}).value || 'eksklusif';
    var lbEks = document.getElementById('labelPPNEksklusif');
    var lbInk = document.getElementById('labelPPNInklusif');
    if (lbEks) { lbEks.classList.toggle('border-blue-500', mode === 'eksklusif'); lbEks.classList.toggle('bg-blue-50', mode === 'eksklusif'); lbEks.classList.toggle('border-slate-200', mode !== 'eksklusif'); }
    if (lbInk) { lbInk.classList.toggle('border-blue-500', mode === 'inklusif');  lbInk.classList.toggle('bg-blue-50', mode === 'inklusif');  lbInk.classList.toggle('border-slate-200', mode !== 'inklusif'); }
}

function initPengaturanTransaksi() {
    // Radio button PPN mode
    document.querySelectorAll('input[name="ppnMode"]').forEach(function(r) {
        r.addEventListener('change', updateStylePPNMode);
    });
    // Live preview prefix
    const prefixInput = document.getElementById('setPrefixStruk');
    if (prefixInput) {
        prefixInput.addEventListener('input', function() {
            const val = (this.value || 'TRX').toUpperCase().replace(/[^A-Z0-9\-_]/g,'');
            const prev = document.getElementById('previewPrefix');
            if (prev) prev.innerText = val || 'TRX';
        });
    }
    // Live preview PPN
    const ppnInput = document.getElementById('setPPNPct');
    if (ppnInput) ppnInput.addEventListener('input', updatePreviewPPN);
    // Live preview diskon
    const diskonInput = document.getElementById('setDiskonGlobal');
    if (diskonInput) {
        diskonInput.addEventListener('input', function() {
            const pct = parseFloat(this.value) || 0;
            const prevBox = document.getElementById('previewDiskon');
            const prevNom = document.getElementById('previewDiskonNominal');
            if (prevBox && prevNom) {
                if (pct > 0) {
                    prevNom.innerText = formatRupiah(100000 * pct / 100);
                    prevBox.classList.remove('hidden');
                } else {
                    prevBox.classList.add('hidden');
                }
            }
        });
    }
}

async function simpanPengaturanTransaksi() {
    // Ambil nilai dari field
    const prefix    = (document.getElementById('setPrefixStruk')?.value || 'TRX').toUpperCase().replace(/[^A-Z0-9\-_]/g,'').slice(0,10) || 'TRX';
    const diskonPct = parseFloat(document.getElementById('setDiskonGlobal')?.value) || 0;
    const diskonAkt = document.getElementById('setDiskonGlobalAktif')?.checked ? 1 : 0;

    // Ambil data profil toko yang sudah ada (tidak mau overwrite)
    const ppnPctVal  = parseFloat(document.getElementById('setPPNPct')?.value) || 0;
    const ppnAktVal  = document.getElementById('setPPNAktif')?.checked ? 1 : 0;
    const ppnModeVal = document.querySelector('input[name="ppnMode"]:checked')?.value || 'exclude';
    const d = {
        nama_toko:          profilToko.nama_toko   || '',
        alamat_toko:        profilToko.alamat_toko || '',
        telp_toko:          profilToko.telp_toko   || '',
        prefix_struk:       prefix,
        diskon_global:      diskonPct,
        diskon_global_aktif: diskonAkt,
        ppn_pct:            ppnPctVal,
        ppn_aktif:          ppnAktVal,
        ppn_mode:           ppnModeVal,
        ppn_mode:           (document.querySelector('input[name="ppnMode"]:checked')?.value || 'eksklusif')
    };
    try {
        const res = await fetchAuth('/api/pengaturan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        if (res.ok) {
            prefixStruk       = prefix;
            diskonGlobalPct   = diskonPct;
            diskonGlobalAktif = !!diskonAkt;
            ppnPct   = ppnPctVal;
            ppnAktif = !!ppnAktVal;
            ppnMode  = ppnModeVal;
            ppnMode  = document.querySelector('input[name="ppnMode"]:checked')?.value || 'eksklusif';
            // Update tombol toggle diskon di kasir
            const btnToggle = document.getElementById('btnToggleDiskon');
            if (btnToggle) {
                if (diskonPct > 0) {
                    btnToggle.classList.remove('hidden');
                    if (diskonGlobalAktif) {
                        btnToggle.classList.replace('bg-slate-700','bg-green-600');
                        btnToggle.classList.replace('text-slate-400','text-white');
                        btnToggle.innerText = 'Diskon ' + diskonPct + '% ON';
                    } else {
                        btnToggle.classList.replace('bg-green-600','bg-slate-700');
                        btnToggle.classList.replace('text-white','text-slate-400');
                        btnToggle.innerText = 'Diskon ' + diskonPct + '%';
                    }
                } else {
                    btnToggle.classList.add('hidden');
                }
            }
            showAlert('Sukses', 'Pengaturan transaksi berhasil disimpan!', 'success');
        } else { showAlert('Gagal', 'Gagal menyimpan pengaturan.', 'error'); }
    } catch { showAlert('Gagal', 'Koneksi ke server terputus.', 'error'); }
}

// ─── BACKUP & RESTORE ──────────────────────────────────────

async function jalankanBackup() {
    const btn = document.getElementById('btnBackup');
    if (btn) { btn.innerText = 'MEMPROSES...'; btn.disabled = true; btn.classList.add('opacity-50'); }
    try {
        const res = await fetchAuth('/api/backup');
        if (!res.ok) throw new Error('Gagal mengambil data backup');
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : 'posweb-backup.json';
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        const now = new Date().toLocaleString('id-ID');
        localStorage.setItem('lastBackup', now);
        const infoEl = document.getElementById('infoBackupTerakhir');
        if (infoEl) { infoEl.innerText = 'Backup terakhir: ' + now; infoEl.classList.remove('hidden'); }
        showAlert('Backup Berhasil', 'File backup berhasil diunduh. Simpan di tempat aman!', 'success');
    } catch (e) {
        showAlert('Backup Gagal', e.message || 'Terjadi kesalahan saat backup.', 'error');
    } finally {
        if (btn) { btn.innerText = 'Unduh Backup Sekarang'; btn.disabled = false; btn.classList.remove('opacity-50'); }
    }
}

function handleFileRestore(input) {
    const file = input.files[0];
    if (!file) return;
    const labelEl = document.getElementById('labelFileRestore');
    const btnEl   = document.getElementById('btnRestore');
    const reader  = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.meta || !parsed.data) throw new Error('Bukan file backup POSweb yang valid');
            restoreFileData = parsed;
            if (labelEl) labelEl.innerText = file.name;
            if (btnEl)   btnEl.disabled = false;
        } catch (err) {
            restoreFileData = null;
            if (labelEl) labelEl.innerText = 'File tidak valid — coba file lain';
            if (btnEl)   btnEl.disabled = true;
            showAlert('File Tidak Valid', 'File yang dipilih bukan backup POSweb yang valid.', 'error');
        }
    };
    reader.readAsText(file);
}

async function jalankanRestore() {
    if (!restoreFileData) return showAlert('Pilih File', 'Pilih file backup terlebih dahulu.', 'error');
    const waktuBackup = restoreFileData.meta?.waktu_backup ? new Date(restoreFileData.meta.waktu_backup).toLocaleString('id-ID') : 'tidak diketahui';
    showConfirm(
        'Restore Database?',
        'SEMUA DATA SAAT INI AKAN DIHAPUS dan diganti dengan data backup tanggal ' + waktuBackup + '. Proses ini tidak bisa dibatalkan!',
        async () => {
            const btn = document.getElementById('btnRestore');
            if (btn) { btn.innerText = 'MEMPROSES...'; btn.disabled = true; btn.classList.add('opacity-50'); }
            try {
                const res = await fetchAuth('/api/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backup: restoreFileData }) });
                const d = await res.json();
                if (res.ok && d.success) {
                    showAlert('Restore Berhasil', 'Data berhasil dipulihkan. Halaman akan dimuat ulang...', 'success');
                    restoreFileData = null;
                    const inputEl = document.getElementById('inputFileRestore');
                    if (inputEl) inputEl.value = '';
                    const labelEl = document.getElementById('labelFileRestore');
                    if (labelEl) labelEl.innerText = 'Pilih File Backup (.json)';
                    setTimeout(() => { localStorage.clear(); location.reload(); }, 2000);
                } else {
                    showAlert('Restore Gagal', d.pesan || 'Terjadi kesalahan saat restore.', 'error');
                    if (btn) { btn.innerText = 'Restore Sekarang'; btn.disabled = false; btn.classList.remove('opacity-50'); }
                }
            } catch (e) {
                showAlert('Restore Gagal', 'Koneksi ke server terputus.', 'error');
                if (btn) { btn.innerText = 'Restore Sekarang'; btn.disabled = false; btn.classList.remove('opacity-50'); }
            }
        }
    );
}


// ─── TEMA WARNA ────────────────────────────────────────────

var TEMA_COLORS = {
    biru:   { primary: '#2563eb', hover: '#1d4ed8', light: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', shadow: 'rgba(37,99,235,0.25)' },
    hijau:  { primary: '#16a34a', hover: '#15803d', light: '#f0fdf4', border: '#bbf7d0', text: '#15803d', shadow: 'rgba(22,163,74,0.25)' },
    ungu:   { primary: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', shadow: 'rgba(124,58,237,0.25)' },
    merah:  { primary: '#dc2626', hover: '#b91c1c', light: '#fef2f2', border: '#fecaca', text: '#b91c1c', shadow: 'rgba(220,38,38,0.25)' },
    orange: { primary: '#ea580c', hover: '#c2410c', light: '#fff7ed', border: '#fed7aa', text: '#c2410c', shadow: 'rgba(234,88,12,0.25)' },
    pink:   { primary: '#db2777', hover: '#be185d', light: '#fdf2f8', border: '#fbcfe8', text: '#be185d', shadow: 'rgba(219,39,119,0.25)' },
};

function applyTema(nama) {
    const c = TEMA_COLORS[nama] || TEMA_COLORS.biru;
    const root = document.documentElement;
    root.style.setProperty('--tema-primary',  c.primary);
    root.style.setProperty('--tema-hover',    c.hover);
    root.style.setProperty('--tema-light',    c.light);
    root.style.setProperty('--tema-border',   c.border);
    root.style.setProperty('--tema-text',     c.text);
    root.style.setProperty('--tema-shadow',   c.shadow);
    localStorage.setItem('temaWarna', nama);
    // Update active state di UI pilihan tema
    document.querySelectorAll('.tema-btn').forEach(b => {
        b.classList.remove('ring-2', 'ring-offset-2', 'ring-slate-700', 'scale-110');
    });
    const activeBtn = document.querySelector('.tema-btn[data-tema="' + nama + '"]');
    if (activeBtn) activeBtn.classList.add('ring-2', 'ring-offset-2', 'ring-slate-700', 'scale-110');
}

function loadTema() {
    const saved = localStorage.getItem('temaWarna') || 'biru';
    applyTema(saved);
}

// ─── DISKON GLOBAL KASIR ───────────────────────────────────

function toggleDiskonGlobal() {
    diskonGlobalAktif = !diskonGlobalAktif;
    updateTombolDiskon();
    renderKeranjang();
}

function updateTombolDiskon() {
    const btn = document.getElementById('btnToggleDiskon');
    if (!btn) return;
    if (diskonGlobalAktif) {
        btn.classList.remove('bg-slate-700', 'text-slate-400');
        btn.classList.add('bg-green-600', 'text-white');
        btn.innerText = 'Diskon ' + diskonGlobalPct + '% ON';
    } else {
        btn.classList.remove('bg-green-600', 'text-white');
        btn.classList.add('bg-slate-700', 'text-slate-400');
        btn.innerText = 'Diskon ' + diskonGlobalPct + '% OFF';
    }
}

function loadInfoBackup() {
    const last    = localStorage.getItem('lastBackup');
    const infoEl  = document.getElementById('infoBackupTerakhir');
    const belumEl = document.getElementById('infoBackupBelum');
    if (last) {
        if (infoEl)  { infoEl.innerText = 'Backup terakhir: ' + last; infoEl.classList.remove('hidden'); }
        if (belumEl) { belumEl.classList.add('hidden'); }
    } else {
        if (infoEl)  { infoEl.classList.add('hidden'); }
        if (belumEl) { belumEl.classList.remove('hidden'); }
    }
}

// ─── INIT ─────────────────────────────────────────────────

// ─── UNDUH PDF STRUK ───────────────────────────────────────

function buildStrukHTML(data) {
    var toko   = profilToko.nama_toko   || '';
    var alamat = profilToko.alamat_toko || '';
    var footer = localStorage.getItem('footerStruk') || 'Terima Kasih';
    var itemsHTML = '';
    if (data.items) {
        data.items.forEach(function(i) {
            var nama     = i.nama_barang || i.nama || '';
            var qty      = i.qty || 0;
            var harga    = parseFloat(i.harga || i.harga_jual || 0);
            var subtotal = parseFloat(i.subtotal || (qty * harga));
            itemsHTML += '<tr><td colspan="2" style="padding-bottom:2px;font-weight:700;">' + nama + '</td></tr>' +
                '<tr><td style="padding-bottom:6px;font-size:9px;padding-left:6px;color:#555;">' + qty + ' x ' + formatRupiah(harga) + '</td>' +
                '<td style="padding-bottom:6px;text-align:right;font-weight:700;">' + formatRupiah(subtotal) + '</td></tr>';
        });
    }
    var isTunai = (data.metode || '').toUpperCase() !== 'QRIS';
    var bayarRow = isTunai
        ? '<tr><td style="font-weight:700;">TUNAI</td><td style="text-align:right;font-weight:700;">' + formatRupiah(data.bayar || data.total) + '</td></tr>' +
          '<tr><td style="font-weight:700;">KEMBALI</td><td style="text-align:right;font-weight:700;">' + formatRupiah((data.bayar || data.total) - data.total) + '</td></tr>'
        : '';
    var logoSrc = profilToko.logo_toko || '';
    // Diskon per produk di PDF
    var diskonProdukHTML = '';
    if (data.items) {
        data.items.forEach(function(i) {
            var dk = parseFloat(i.diskon || 0);
            if (dk > 0) {
                var harga = parseFloat(i.harga || i.harga_jual || 0);
                var qty   = parseInt(i.qty) || 1;
                var nom   = Math.round(harga * qty * dk / 100);
                var nama  = (i.nama_barang || i.nama || '').slice(0,14);
                diskonProdukHTML += '<tr><td style="font-size:9px;color:#15803d;">Diskon ' + nama + ' (' + dk + '%)</td>' +
                    '<td style="text-align:right;font-size:9px;color:#15803d;">-' + formatRupiah(nom) + '</td></tr>';
            }
        });
    }
    var logoHTML = logoSrc ? '<img src="' + logoSrc + '" style="width:48px;height:48px;object-fit:contain;margin:0 auto 4px;display:block;" alt="Logo"><br>' : '';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
        '* { margin:0; padding:0; box-sizing:border-box; }' +
        'body { font-family: monospace; font-size: 11px; width: 220px; margin: 0 auto; padding: 8px; color: #000; background: #fff; }' +
        '.center { text-align: center; } .hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }' +
        'table { width: 100%; border-collapse: collapse; }' +
        '@media print { @page { size: 58mm auto; margin: 2mm; } }' +
        '</style></head><body>' +
        '<div class="center">' + logoHTML + '<b style="font-size:13px;text-transform:uppercase;">' + toko + '</b><br>' +
        '<span style="font-size:9px;">' + alamat + '</span>' +
        (profilToko.jam_text ? '<br><span style="font-size:9px;">' + profilToko.jam_text + '</span>' : '') +
        '</div>' +
        '<hr class="hr">' +
        '<div class="center" style="font-size:9px;margin-bottom:4px;">' + (data.tanggal || new Date().toLocaleString('id-ID')) + '</div>' +
        '<div class="center" style="font-weight:700;margin-bottom:6px;border-bottom:1px dashed #000;padding-bottom:4px;">' + data.no + '</div>' +
        '<table>' + itemsHTML + '</table>' +
        '<hr class="hr">' +
        '<table>' +
        diskonProdukHTML +
        (data.diskon_nominal > 0 ? '<tr><td style="font-size:9px;">SUBTOTAL</td><td style="text-align:right;font-size:9px;">' + formatRupiah((data.total || 0) + (data.diskon_nominal || 0) - (data.ppn_nominal || 0)) + '</td></tr>' +
        '<tr><td style="font-size:9px;color:#15803d;">DISKON ' + (data.diskonPct || '') + '</td><td style="text-align:right;font-size:9px;color:#15803d;">-' + formatRupiah(data.diskon_nominal) + '</td></tr>' : '') +
        (data.ppn_nominal > 0 ? '<tr><td style="font-size:9px;color:#2563eb;">PPN ' + (data.ppnPct || '') + '%</td><td style="text-align:right;font-size:9px;color:#2563eb;">+' + formatRupiah(data.ppn_nominal) + '</td></tr>' : '') +
        '<tr><td style="font-weight:700;">TOTAL</td><td style="text-align:right;font-weight:700;">' + formatRupiah(data.total) + '</td></tr>' +
        '<tr><td style="font-weight:700;">METODE</td><td style="text-align:right;font-weight:700;">' + (data.metode || 'TUNAI').toUpperCase() + '</td></tr>' +
        bayarRow + '</table>' +
        '<div class="center" style="margin-top:10px;border-top:1px dashed #000;padding-top:6px;font-style:italic;font-size:9px;">' +
        'Kasir: ' + (data.kasir || '') + '<br>' + footer + '</div>' +
        '</body></html>';
}

function unduhStrukPDF() {
    if (!lastTrxData || !lastTrxData.no) return showAlert('Error', 'Data transaksi tidak ditemukan.', 'error');
    _doUnduhPDF({
        no:             lastTrxData.no,
        tanggal:        new Date().toLocaleString('id-ID'),
        kasir:          lastTrxData.kasir,
        metode:         lastTrxData.metode,
        total:          lastTrxData.total,
        bayar:          lastTrxData.bayar,
        items:          lastTrxData.items,
        diskon_nominal: lastTrxData.diskon_nominal || 0,
        diskonPct:      diskonGlobalAktif && diskonGlobalPct > 0 ? diskonGlobalPct + '%' : '',
        ppn_nominal:    lastTrxData.ppn_nominal || 0,
        ppnPct:         ppnAktif && ppnPct > 0 ? ppnPct : 0
    });
}

function unduhStrukPDFDariData(data) { _doUnduhPDF(data); }

async function langungUnduhPDF(id, no, tgl, tot, kas, metode) {
    try {
        var res   = await fetchAuth('/api/transaksi/detail/' + id);
        var items = await res.json();
        _doUnduhPDF({ no: no, tanggal: new Date(tgl).toLocaleString('id-ID'), kasir: kas, metode: metode, total: tot, bayar: tot, items: items });
    } catch(e) { showAlert('Error', 'Gagal memuat data struk.', 'error'); }
}

function _doUnduhPDF(data) {
    if (typeof window.jspdf === 'undefined') {
        showAlert('Gagal', 'Library PDF belum siap. Pastikan koneksi internet aktif lalu refresh halaman.', 'error');
        return;
    }

    var jsPDF    = window.jspdf.jsPDF;
    var filename = 'struk-' + (data.no || 'transaksi').replace(/[^a-zA-Z0-9]/g, '-') + '.pdf';
    var toko     = profilToko.nama_toko   || '';
    var alamat   = profilToko.alamat_toko || '';
    var footer   = localStorage.getItem('footerStruk') || 'Terima Kasih';

    // Tulis langsung ke PDF pakai jsPDF text — tidak render ke DOM sama sekali
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, 297] });
    var x   = 29;   // center 58mm
    var y   = 8;
    var lh  = 4.5;  // line height mm

    function line(txt, bold, size, align) {
        doc.setFontSize(size || 8);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        if (align === 'left')       doc.text(String(txt), 4, y);
        else if (align === 'right') doc.text(String(txt), 54, y, { align: 'right' });
        else                         doc.text(String(txt), x, y, { align: 'center' });
        y += lh;
    }
    function separator() {
        doc.setDrawColor(0);
        doc.line(4, y, 54, y);
        y += 2;
    }
    function dashedLine() {
        // Garis putus-putus manual
        doc.setLineDashPattern([1, 1], 0);
        doc.line(4, y, 54, y);
        doc.setLineDashPattern([], 0);
        y += 2;
    }

    // Header toko
    if (profilToko.logo_toko) {
        try { doc.addImage(profilToko.logo_toko, 'JPEG', 22, y, 14, 14); y += 16; } catch(e) {}
    }
    line(toko.toUpperCase(), true, 10);
    if (alamat) line(alamat, false, 7);
    if (profilToko.telp_toko) line('Telp: ' + profilToko.telp_toko, false, 7);
    if (profilToko.jam_text) line(profilToko.jam_text, false, 6.5);
    dashedLine();

    // Info transaksi
    line(data.tanggal || new Date().toLocaleString('id-ID'), false, 7);
    line(data.no, true, 8);
    line('Kasir: ' + (data.kasir || ''), false, 7);
    dashedLine();

    // Item
    var items = data.items || [];
    items.forEach(function(i) {
        var nama     = i.nama_barang || i.nama || '';
        var qty      = i.qty || 0;
        var harga    = parseFloat(i.harga || i.harga_jual || 0);
        var subtotal = parseFloat(i.subtotal || (qty * harga));
        var dk       = parseFloat(i.diskon || 0);

        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(nama, 4, y);
        y += lh;

        doc.setFont('helvetica', 'normal');
        var qtyStr = qty + ' x ' + formatRupiah(harga) + (dk > 0 ? ' (-' + dk + '%)' : '');
        doc.text(qtyStr, 6, y);
        doc.text(formatRupiah(subtotal), 54, y, { align: 'right' });
        y += lh;
    });

    dashedLine();

    // Diskon per produk
    var adaDiskonProduk = items.some(function(i) { return parseFloat(i.diskon||0) > 0; });
    if (adaDiskonProduk) {
        items.filter(function(i){ return parseFloat(i.diskon||0) > 0; }).forEach(function(i) {
            var nom = Math.round(parseFloat(i.harga||i.harga_jual||0) * (i.qty||1) * parseFloat(i.diskon) / 100);
            doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            doc.text('Diskon ' + (i.nama_barang||i.nama||'').slice(0,14) + ' (' + i.diskon + '%)', 4, y);
            doc.text('-' + formatRupiah(nom), 54, y, { align: 'right' });
            y += lh;
        });
    }

    // Diskon global
    if (data.diskon_nominal > 0) {
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        var subtotalKotor = (data.total || 0) + (data.diskon_nominal || 0) - (data.ppn_nominal || 0);
        doc.text('Subtotal', 4, y); doc.text(formatRupiah(subtotalKotor), 54, y, { align: 'right' }); y += lh;
        doc.text('Diskon ' + (data.diskonPct || ''), 4, y); doc.text('-' + formatRupiah(data.diskon_nominal), 54, y, { align: 'right' }); y += lh;
    }

    // PPN
    if (data.ppn_nominal > 0) {
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text('PPN ' + (data.ppnPct || '') + '%', 4, y);
        doc.text('+' + formatRupiah(data.ppn_nominal), 54, y, { align: 'right' });
        y += lh;
    }

    separator();

    // Total
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 4, y); doc.text(formatRupiah(data.total), 54, y, { align: 'right' }); y += lh;

    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('METODE', 4, y); doc.text((data.metode || 'TUNAI').toUpperCase(), 54, y, { align: 'right' }); y += lh;

    var isTunai = (data.metode || '').toUpperCase() !== 'QRIS';
    if (isTunai) {
        var bayar = data.bayar || data.total;
        doc.text('TUNAI',   4, y); doc.text(formatRupiah(bayar), 54, y, { align: 'right' }); y += lh;
        doc.text('KEMBALI', 4, y); doc.text(formatRupiah(bayar - data.total), 54, y, { align: 'right' }); y += lh;
    }

    dashedLine();

    // Footer
    doc.setFontSize(7); doc.setFont('helvetica', 'italic');
    doc.text(footer, x, y, { align: 'center' });

    // Crop PDF ke tinggi konten
    var finalHeight = y + 6;
    var docFinal = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, finalHeight] });
    // Salin halaman ke doc baru dengan tinggi pas
    var pageData = doc.output('arraybuffer');
    // Langsung save dari doc asli — jsPDF tidak crop otomatis tapi format sudah 297mm yang cukup
    doc.save(filename);
}

window.onload = function () {
    // Reset idle timer setiap ada aktivitas user
    ['mousemove','keydown','touchstart','click','scroll'].forEach(function(ev) {
        document.addEventListener(ev, resetIdleTimer, { passive: true });
    });
    loadTema();
    document.getElementById('btnConfirmOk').onclick = function () {
        const cb = confirmCallback;
        confirmCallback = null;
        closeConfirm();
        if (cb) cb();
    };
    checkAuth();
};
