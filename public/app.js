// ================= VARIABEL GLOBAL (DI ATAS BIAR GA ERROR) =================
var currentPermissions = []; 
var activeCategory = 'All'; 
var dataKatalog = []; 
var keranjang = []; 
var total = 0; 
var totalModal = 0; 
var profilToko = {}; 
var lastTrxData = {}; 
var currentLaporanType = 'harian';
var chartOmzetInstance = null; 
var chartTerlarisInstance = null;
var metodeBayarActive = 'Tunai';
var isEditMode = false;
var isEditUserMode = false;
var semuaTransaksi = []; 
var dataTampilLaporan = [];
var memoriRevisi = {};
var confirmCallback = null;

// ================= CUSTOM UI MODALS =================
function showAlert(title, msg, type = 'error') {
    const modal = document.getElementById('modalAlert');
    const icon = document.getElementById('iconAlert');
    if(type === 'success') {
        icon.className = 'w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4';
        icon.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
    } else {
        icon.className = 'w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4';
        icon.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>';
    }
    document.getElementById('titleAlert').innerText = title;
    document.getElementById('msgAlert').innerText = msg;
    
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeAlert() { 
    const modal = document.getElementById('modalAlert');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function showConfirm(title, msg, callback) {
    document.getElementById('titleConfirm').innerText = title;
    document.getElementById('msgConfirm').innerText = msg;
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

document.getElementById('btnConfirmOk').onclick = () => { 
    const cb = confirmCallback; 
    closeConfirm(); 
    if(cb) cb(); 
};

function toggleSidebar(forceClose = false) {
    const nav = document.getElementById('mainNav');
    const overlay = document.getElementById('sidebarOverlay');
    if (!nav || !overlay) return; 
    if (window.innerWidth >= 768) return; 
    
    const isClosed = nav.classList.contains('-translate-x-full');
    if (forceClose || !isClosed) {
        nav.classList.add('-translate-x-full');
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => { overlay.classList.add('hidden'); }, 300); 
    } else {
        overlay.classList.remove('hidden');
        void overlay.offsetWidth; 
        nav.classList.remove('-translate-x-full');
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
    }
}

function doPrintAction(printEl, restoreFn) {
    document.getElementById('mainApp').style.setProperty('display', 'none', 'important');
    const modalAudit = document.getElementById('modalStrukLaporan');
    if(modalAudit) modalAudit.classList.add('hidden');

    printEl.classList.remove('hidden');
    printEl.classList.add('print-only');
    
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printEl.classList.remove('print-only');
            printEl.classList.add('hidden');
            document.getElementById('mainApp').style.setProperty('display', 'flex', 'important');
            if(restoreFn) restoreFn();
        }, 1500); 
    }, 100);
}

const formatRupiah = (a) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(a||0);
function formatInputBayar(i){let v=i.value.replace(/\D/g,'');i.value=v?new Intl.NumberFormat('id-ID').format(v):'';}
function getAngkaMurni(s){return parseInt((s||'').toString().replace(/\./g,''))||0;}

function pilihMetode(m) {
    metodeBayarActive = m;
    const btnT = document.getElementById('btnMetodeTunai');
    const btnQ = document.getElementById('btnMetodeQris');
    const inputUang = document.getElementById('uangBayar');
    const btnPas = document.getElementById('btnUangPas');

    if(m === 'QRIS') {
        btnQ.className = "w-1/2 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition bg-blue-600 text-white shadow-md border border-blue-500";
        btnT.className = "w-1/2 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700";
        inputUang.disabled = true; inputUang.classList.add('opacity-50');
        btnPas.disabled = true; btnPas.classList.add('opacity-50');
        if(total > 0) inputUang.value = new Intl.NumberFormat('id-ID').format(total);
    } else {
        btnT.className = "w-1/2 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition bg-blue-600 text-white shadow-md border border-blue-500";
        btnQ.className = "w-1/2 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700";
        inputUang.disabled = false; inputUang.classList.remove('opacity-50');
        btnPas.disabled = false; btnPas.classList.remove('opacity-50');
        inputUang.value = ''; 
    }
    hitungKembalian();
}

// ================= SISTEM AUTH & PINDAH LAYAR (ANTI LOGOUT) =================
function checkAuth() {
    try {
        const role = localStorage.getItem('userRole') || ''; 
        const name = localStorage.getItem('userName') || '';

        if (name && role && name !== 'undefined') {
            const loginEl = document.getElementById('pageLogin');
            if (loginEl) {
                loginEl.style.setProperty('display', 'none', 'important');
                loginEl.classList.add('hidden');
            }

            const appEl = document.getElementById('mainApp');
            if (appEl) {
                appEl.style.setProperty('display', 'flex', 'important');
                appEl.classList.remove('hidden');
            }
            
            const userInfoEl = document.getElementById('userInfo');
            if(userInfoEl) userInfoEl.innerText = name.toUpperCase();
            
            const all = ['dashboard', 'kasir','gudang','laporan','pengguna','setting'];
            
            if (name === 'owner' || role === 'owner' || role === 'admin' || role.includes('dashboard')) {
                currentPermissions = all;
            } else if (typeof role === 'string') {
                currentPermissions = role.split(',');
            } else {
                currentPermissions = ['kasir'];
            }
            
            if(!currentPermissions.includes('kasir')) currentPermissions.push('kasir');
            
            all.forEach(t => {
                const btn = document.getElementById('btnNav'+t.charAt(0).toUpperCase()+t.slice(1)); 
                if(btn) { 
                    if(currentPermissions.includes(t)) {
                        btn.style.setProperty('display', 'block', 'important');
                        btn.classList.remove('hidden');
                    } else {
                        btn.style.setProperty('display', 'none', 'important');
                        btn.classList.add('hidden');
                    }
                }
            });
            
            if(currentPermissions.includes('dashboard')) { showTab('dashboard'); } 
            else { showTab('kasir'); }
            
            loadPengaturan();
        } else {
            const loginEl = document.getElementById('pageLogin');
            if (loginEl) {
                loginEl.style.setProperty('display', 'flex', 'important');
                loginEl.classList.remove('hidden');
            }

            const appEl = document.getElementById('mainApp');
            if (appEl) {
                appEl.style.setProperty('display', 'none', 'important');
                appEl.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error("Auth Error:", err);
        // NGGAK ADA LAGI localStorage.clear() DI SINI, BIAR GA LOGOUT SENDIRI
    }
}

async function login(){
    const u = document.getElementById('inputUser').value.trim(); 
    const p = document.getElementById('inputPass').value.trim(); 
    const btn = document.getElementById('btnLoginAction') || document.querySelector('#pageLogin button');

    if (!u || !p) return showAlert('Perhatian', 'Username dan Password wajib diisi!', 'error');

    if(btn) { btn.innerText = "MEMPROSES..."; btn.disabled = true; btn.classList.add('opacity-50'); }

    try {
        const res = await fetch('/api/login', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({username:u, password:p})
        }); 
        const d = await res.json(); 
        
        if (res.ok && d.success) {
            localStorage.setItem('userRole', d.role || 'kasir'); 
            localStorage.setItem('userName', d.username || u); 
            document.getElementById('inputPass').value = '';
            
            checkAuth(); 
        } else {
            showAlert('Akses Ditolak', d.pesan || 'Username atau Password salah.', 'error');
        }
    } catch(e) { 
        showAlert('Koneksi Gagal', 'Tidak dapat terhubung ke server.', 'error'); 
    } finally {
        if(btn) { btn.innerText = "MASUK SEKARANG"; btn.disabled = false; btn.classList.remove('opacity-50'); }
    }
}

function logout(){ localStorage.clear(); location.reload(); }
window.onload = checkAuth;

function showTab(t){
    document.querySelectorAll('.tab-content').forEach(x => {
        x.style.setProperty('display', 'none', 'important');
        x.classList.add('hidden');
    }); 
    document.querySelectorAll('[id^="btnNav"]').forEach(b => b.classList.remove('tab-active')); 
    
    if(currentPermissions.includes(t)){
        const tabEl = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
        if(tabEl) {
            tabEl.style.setProperty('display', 'block', 'important');
            tabEl.classList.remove('hidden');
        }
        const btn = document.getElementById('btnNav'+t.charAt(0).toUpperCase()+t.slice(1));
        if(btn) btn.classList.add('tab-active');
    } 
    
    if(t==='dashboard') loadDashboard();
    if(t==='gudang') loadBarang(); 
    if(t==='laporan') loadDataLaporan(); 
    if(t==='kasir') loadKatalogKasir();
    if(t==='pengguna') loadUsers();
    
    toggleSidebar(true);
}

// ================= FITUR GUDANG & BARANG =================
async function loadBarang(){
    try {
        const res=await fetch('/api/produk'); const d=await res.json(); 
        document.getElementById('listBarang').innerHTML=(Array.isArray(d)?d:[]).map(i=>`<tr class="border-b hover:bg-slate-50 transition"><td class="p-3"><div class="font-bold text-slate-800">${i.nama} <span class="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ml-1 border">${i.kategori||'-'}</span></div><div class="text-[9px] text-slate-400 font-mono mt-0.5">${i.barcode}</div></td><td class="p-3 text-right font-bold text-slate-500">${formatRupiah(i.harga_beli)}</td><td class="p-3 text-right font-black text-blue-600">${formatRupiah(i.harga_jual)}</td><td class="p-3 text-center">${i.stok<=5?`<span class="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black animate-pulse border border-red-200">${i.stok} ${i.satuan||''}</span>`:`<span class="font-black">${i.stok} <span class="text-[9px] text-slate-400 font-bold">${i.satuan||''}</span></span>`}</td><td class="p-3 text-center"><button onclick="siapkanEdit('${i.barcode}','${i.nama.replace(/'/g,"\\'")}','${i.harga_jual}','${i.stok}','${i.harga_beli}','${(i.kategori||'').replace(/'/g,"\\'")}','${(i.satuan||'').replace(/'/g,"\\'")}')" class="text-blue-600 font-bold hover:underline mr-3 text-[10px] uppercase">Edit</button><button onclick="hapusBarang('${i.barcode}')" class="text-red-500 font-bold hover:underline text-[10px] uppercase">Hapus</button></td></tr>`).join('');
    } catch(e) {}
}

function siapkanEdit(b,n,hj,s,hb,k,st){
    document.getElementById('addBarcode').value=b; document.getElementById('addBarcode').disabled=true; document.getElementById('addBarcode').classList.add('opacity-50'); 
    document.getElementById('addNama').value=n; document.getElementById('addHarga').value=hj; 
    document.getElementById('addStok').value=s; document.getElementById('addHargaBeli').value=hb; 
    document.getElementById('addKategori').value=k; document.getElementById('addSatuan').value=st; 
    isEditMode=true; document.getElementById('btnBatalEdit').classList.remove('hidden'); 
    const btn = document.getElementById('btnSimpanBarang');
    if(btn) { btn.innerText = 'Update Barang'; btn.classList.replace('bg-slate-900', 'bg-orange-500'); btn.classList.replace('hover:bg-black', 'hover:bg-orange-600'); }
}

function batalEdit(){
    document.getElementById('addBarcode').value=''; document.getElementById('addBarcode').disabled=false; document.getElementById('addBarcode').classList.remove('opacity-50'); 
    document.getElementById('addNama').value=''; document.getElementById('addHarga').value=''; 
    document.getElementById('addStok').value=''; document.getElementById('addHargaBeli').value=''; 
    document.getElementById('addKategori').value=''; document.getElementById('addSatuan').value=''; 
    isEditMode=false; document.getElementById('btnBatalEdit').classList.add('hidden'); 
    const btn = document.getElementById('btnSimpanBarang');
    if(btn) { btn.innerText = 'Simpan Barang'; btn.classList.replace('bg-orange-500', 'bg-slate-900'); btn.classList.replace('hover:bg-orange-600', 'hover:bg-black'); }
}

function filterGudang() { 
    const kw = document.getElementById('cariBarangGudang').value.toLowerCase(); 
    Array.from(document.getElementById('listBarang').getElementsByTagName('tr')).forEach(r => r.style.display = r.innerText.toLowerCase().includes(kw) ? "" : "none"); 
}

async function simpanBarang() {
    const b = document.getElementById('addBarcode').value.trim();
    const n = document.getElementById('addNama').value.trim();
    const hj = document.getElementById('addHarga').value;
    const hb = document.getElementById('addHargaBeli').value || 0;
    const s = document.getElementById('addStok').value || 0;
    const k = document.getElementById('addKategori').value.trim() || '-';
    const st = document.getElementById('addSatuan').value.trim() || 'pcs';

    if(!b || !n || !hj) {
        showAlert('Perhatian', 'Kolom Barcode, Nama Produk, dan Harga Jual WAJIB diisi!', 'error');
        return;
    }

    const d = { barcode: b, nama: n, harga_jual: hj, harga_beli: hb, stok: s, kategori: k, satuan: st };
    const btn = document.getElementById('btnSimpanBarang');
    if(btn) { btn.innerText = "MENYIMPAN..."; btn.disabled = true; btn.classList.add('opacity-50'); }

    try {
        const res = await fetch(isEditMode ? `/api/produk/${d.barcode}` : '/api/produk', {
            method: isEditMode ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d)
        }); 
        
        if(res.ok) {
            showAlert('Sukses', 'Data Barang berhasil disimpan!', 'success');
            batalEdit(); 
            loadBarang(); 
            loadKatalogKasir(); 
        } else {
            showAlert('Gagal', 'Barcode mungkin sudah digunakan.', 'error');
        }
    } catch(e) { 
        console.error(e);
        showAlert('Gagal', 'Koneksi ke server terputus.', 'error'); 
    } finally {
        if(btn) {
            btn.innerText = isEditMode ? 'Update Barang' : 'Simpan Barang';
            btn.disabled = false;
            btn.classList.remove('opacity-50');
        }
    }
}

async function hapusBarang(b) { 
    showConfirm('Hapus Barang?', 'Anda yakin ingin menghapus barang ini secara permanen?', async () => { 
        await fetch(`/api/produk/${b}`, { method: 'DELETE' }); 
        loadBarang(); 
        loadKatalogKasir(); 
        showAlert('Terhapus', 'Barang berhasil dihapus.', 'success');
    }); 
}

// ================= FITUR DASHBOARD =================
async function loadDashboard() {
    try {
        const [resTx, resPr, resTr] = await Promise.all([ fetch('/api/transaksi'), fetch('/api/produk'), fetch('/api/terlaris') ]);
        const txData = await resTx.json(); const prData = await resPr.json(); const trData = await resTr.json();

        const todayStr = new Date().toISOString().split('T')[0];
        let omzetHariIni = 0, labaHariIni = 0;
        
        const last7Days = []; const omzet7Days = [];
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            last7Days.push(d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}));
            
            const dailyTx = (Array.isArray(txData)?txData:[]).filter(t => t.tanggal && t.tanggal.startsWith(dStr));
            const dailyOmzet = dailyTx.reduce((sum, t) => sum + parseFloat(t.total_bayar||0), 0);
            omzet7Days.push(dailyOmzet);

            if(i === 0) { 
                omzetHariIni = dailyOmzet;
                labaHariIni = dailyTx.reduce((sum, t) => sum + (parseFloat(t.total_bayar||0) - parseFloat(t.total_modal||0)), 0);
            }
        }

        document.getElementById('dashOmzetHariIni').innerText = formatRupiah(omzetHariIni);
        document.getElementById('dashLabaHariIni').innerText = formatRupiah(labaHariIni);
        document.getElementById('dashTotalProduk').innerText = (Array.isArray(prData)?prData:[]).length;
        document.getElementById('dashTotalStok').innerText = (Array.isArray(prData)?prData:[]).reduce((sum, p) => sum + parseInt(p.stok||0), 0);

        if (typeof Chart !== 'undefined') {
            if(chartOmzetInstance) chartOmzetInstance.destroy();
            const ctxOmzet = document.getElementById('chartOmzet').getContext('2d');
            chartOmzetInstance = new Chart(ctxOmzet, {
                type: 'line', data: { labels: last7Days, datasets: [{ label: 'Omzet (Rp)', data: omzet7Days, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 2, fill: true, tension: 0.3 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

            if(chartTerlarisInstance) chartTerlarisInstance.destroy();
            const ctxTerlaris = document.getElementById('chartTerlaris').getContext('2d');
            const topData = Array.isArray(trData) ? trData : [];
            chartTerlarisInstance = new Chart(ctxTerlaris, {
                type: 'bar', data: { labels: topData.map(d => d.nama_barang), datasets: [{ label: 'Terjual (Qty)', data: topData.map(d => d.total_qty), backgroundColor: '#16a34a', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch(e) { }
}

// ================= FITUR SETTING =================
async function loadPengaturan(){
    try {
        const res=await fetch('/api/pengaturan'); const d=await res.json(); 
        if(d){
            profilToko=d; 
            document.getElementById('setNamaToko').value=d.nama_toko||''; 
            document.getElementById('setAlamat').value=d.alamat_toko||''; 
            document.getElementById('setTelp').value=d.telp_toko||''; 
            document.getElementById('headerNamaToko').innerText=d.nama_toko||'POSweb by Rsby'; 
            document.getElementById('headerAlamatTelp').innerText=`${d.alamat_toko||''} | Telp: ${d.telp_toko||''}`; 
            document.getElementById('strukNamaTokoPrint').innerText=d.nama_toko||''; 
            document.getElementById('strukAlamatTelpPrint').innerText=d.alamat_toko||'';
        }
        const kertas = localStorage.getItem('ukuranKertas') || '58mm';
        const footer = localStorage.getItem('footerStruk') || 'Terima Kasih';
        document.getElementById('setUkuranKertas').value = kertas;
        document.getElementById('setFooterStruk').value = footer;
        document.getElementById('strukFooterText').innerText = footer;
        
        const areaStruk = document.getElementById('areaStruk');
        if(kertas === '80mm') { areaStruk.classList.replace('max-w-[58mm]', 'max-w-[80mm]'); } 
        else { areaStruk.classList.replace('max-w-[80mm]', 'max-w-[58mm]'); }
    } catch(e){}
}

async function simpanPengaturan(){
    const d={nama_toko:document.getElementById('setNamaToko').value,alamat_toko:document.getElementById('setAlamat').value,telp_toko:document.getElementById('setTelp').value}; 
    try { await fetch('/api/pengaturan',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); showAlert('Sukses', 'Profil Toko tersimpan.', 'success'); loadPengaturan(); } catch(e) { showAlert('Gagal', 'Gagal menyimpan pengaturan.', 'error'); }
}

function simpanPengaturanPrinter() {
    const kertas = document.getElementById('setUkuranKertas').value;
    const footer = document.getElementById('setFooterStruk').value;
    localStorage.setItem('ukuranKertas', kertas); localStorage.setItem('footerStruk', footer);
    document.getElementById('strukFooterText').innerText = footer || 'Terima Kasih';
    const areaStruk = document.getElementById('areaStruk');
    if(kertas === '80mm') { areaStruk.classList.replace('max-w-[58mm]', 'max-w-[80mm]'); } 
    else { areaStruk.classList.replace('max-w-[80mm]', 'max-w-[58mm]'); }
    showAlert('Sukses', 'Printer dan Struk tersimpan.', 'success');
}

// ================= FITUR KASIR =================
async function loadKatalogKasir(){
    try {
        const res = await fetch('/api/produk'); dataKatalog = Array.isArray(await res.json()) ? await res.json() : [];
        const cats = ['All', ...new Set(dataKatalog.map(i => i.kategori || '-'))]; 
        const catContainer = document.getElementById('containerKategori');
        if(catContainer) catContainer.innerHTML = cats.map(c => `<button onclick="setCategory('${c}')" class="px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory===c?'bg-blue-600 text-white border-blue-600 shadow-md':'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}">${c}</button>`).join(''); 
        filterKatalog();
    } catch(e) { dataKatalog = []; filterKatalog(); }
}
function setCategory(c) { activeCategory=c; filterKatalog(); }
function filterKatalog() {
    if(!dataKatalog) return;
    const kw = ((document.getElementById('cariKatalog') ? document.getElementById('cariKatalog').value : '') || (document.getElementById('scanBarcode') ? document.getElementById('scanBarcode').value : '')).toLowerCase(); 
    const filtered = dataKatalog.filter(i => { const n = (i.nama || '').toLowerCase(); const b = (i.barcode || '').toLowerCase(); const k = i.kategori || '-'; return (n.includes(kw) || b.includes(kw)) && (activeCategory === 'All' || k === activeCategory); }); 
    const listEl = document.getElementById('listKatalogKasir'); if(!listEl) return;
    if(filtered.length === 0) { listEl.innerHTML='<div class="col-span-full py-8 text-center text-slate-400 italic text-xs font-bold">Barang tidak ditemukan</div>'; return; }
    listEl.innerHTML = filtered.map(i => {
        const stockLabel = i.stok <= 5 ? `<span class="bg-red-50 text-red-500 border border-red-200 px-1 rounded animate-pulse">Sisa: ${i.stok}</span>` : `<span class="bg-slate-50 text-slate-400 border px-1 rounded">Stok: ${i.stok}</span>`;
        return `<div class="bg-white border border-slate-200 p-2.5 rounded-xl cursor-pointer hover:border-blue-400 active:scale-95 transition-all shadow-sm flex flex-col justify-between" onclick="tambahItem('${i.barcode}')"><div><div class="font-bold text-[11px] uppercase truncate leading-tight mb-1">${i.nama}</div><div class="text-[9px] font-mono text-slate-400 mb-1.5">${i.barcode}</div><div class="text-blue-600 font-black text-sm">${formatRupiah(i.harga_jual)}</div></div><div class="mt-2 text-[8px] uppercase font-bold tracking-widest w-fit">${stockLabel}</div></div>`}).join('');
}
function handleScan(e) {
    filterKatalog(); 
    if(e.key === 'Enter') {
        const bc = document.getElementById('scanBarcode').value; if(!bc) return;
        const item = dataKatalog.find(i => i.barcode === bc);
        if(item) { tambahItem(bc); } else { showAlert('Tidak Ditemukan', 'Barcode tidak terdaftar.', 'error'); }
        document.getElementById('scanBarcode').value = ''; filterKatalog();
    }
}
function tambahItem(b){
    const i = dataKatalog.find(x => x.barcode === b); 
    if(!i || i.stok <= 0) return showAlert('Stok Habis', 'Barang ini kosong.', 'error'); 
    const x = keranjang.findIndex(k => k.barcode === b); 
    if(x > -1) {
        if(keranjang[x].qty + 1 > i.stok) return showAlert('Stok Kurang', 'Sisa stok tidak mencukupi.', 'error'); 
        keranjang[x].qty++; keranjang[x].subtotal = keranjang[x].qty * keranjang[x].harga_jual;
    } else { keranjang.push({...i, qty: 1, subtotal: parseFloat(i.harga_jual), harga_beli: parseFloat(i.harga_beli || 0)}); }
    renderKeranjang();
}
function gantiQty(idx, m){
    keranjang[idx].qty += m; 
    if(keranjang[idx].qty <= 0) keranjang.splice(idx, 1); 
    else if(keranjang[idx].qty > keranjang[idx].stok) { showAlert('Batas Maksimal', 'Jumlah melebihi stok.', 'error'); keranjang[idx].qty--; } 
    if(keranjang[idx]) keranjang[idx].subtotal = keranjang[idx].qty * keranjang[idx].harga_jual; 
    renderKeranjang();
}
function renderKeranjang(){
    total = 0; totalModal = 0; 
    if(!keranjang.length){
        document.getElementById('areaKeranjang').innerHTML='<div class="text-center py-12 text-slate-300 italic text-[11px] uppercase font-bold tracking-widest">Keranjang Kosong</div>'; 
        document.getElementById('totalBelanja').innerText='Rp0'; document.getElementById('itemCount').innerText='0 ITEMS'; 
        if(metodeBayarActive === 'QRIS') document.getElementById('uangBayar').value = '';
        return;
    } 
    document.getElementById('areaKeranjang').innerHTML=`<table class="w-full">` + keranjang.map((i,idx) => {
        total += i.subtotal; totalModal += (i.harga_beli * i.qty); 
        return `<tr class="border-b hover:bg-slate-50 transition"><td class="py-2 px-1"><div class="font-bold text-[11px] leading-tight" style="word-break: break-word;">${i.nama}</div><div class="text-[9px] text-slate-400 mt-0.5">@${formatRupiah(i.harga_jual)}</div></td><td align="center"><div class="flex items-center justify-center gap-1.5 bg-slate-100 rounded-lg p-1"><button onclick="gantiQty(${idx},-1)" class="w-6 h-6 bg-white text-red-500 rounded shadow-sm font-black">-</button><span class="w-5 font-black text-[11px] text-center">${i.qty}</span><button onclick="gantiQty(${idx},1)" class="w-6 h-6 bg-white text-blue-600 rounded shadow-sm font-black">+</button></div></td><td align="right" class="font-black text-[11px]">${formatRupiah(i.subtotal)}</td></tr>`
    }).join('') + `</table>`; 
    document.getElementById('totalBelanja').innerText = formatRupiah(total); document.getElementById('itemCount').innerText = keranjang.length + ' ITEMS'; 
    if(metodeBayarActive === 'QRIS') { document.getElementById('uangBayar').value = new Intl.NumberFormat('id-ID').format(total); }
    hitungKembalian();
}

function hitungKembalian() { const b = getAngkaMurni(document.getElementById('uangBayar').value); document.getElementById('uangKembalian').innerText = b >= total ? formatRupiah(b - total) : 'Rp0'; }
function setUangPas(){ if(total <= 0) return; document.getElementById('uangBayar').value = new Intl.NumberFormat('id-ID').format(total); hitungKembalian(); }

async function prosesBayar(){
    const b = getAngkaMurni(document.getElementById('uangBayar').value); 
    if(!keranjang.length) return showAlert('Pembayaran Gagal', 'Keranjang kosong.', 'error'); 
    if(metodeBayarActive === 'Tunai' && b < total) return showAlert('Pembayaran Gagal', 'Uang tunai kurang.', 'error'); 
    
    const no = 'TRX-' + Date.now(); const kasir = localStorage.getItem('userName'); 
    try { 
        await fetch('/api/transaksi',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ no_struk:no, total_bayar:total, total_modal:totalModal, keranjang, kasir, metode_bayar:metodeBayarActive }) }); 
        
        document.getElementById('strukTanggal').innerText = new Date().toLocaleString('id-ID'); document.getElementById('strukNomor').innerText = no; document.getElementById('strukNamaKasir').innerText = kasir.toUpperCase(); 
        document.getElementById('strukItem').innerHTML = keranjang.map(i=>`<tr><td class="pb-1">${i.nama}</td><td align="right" class="pb-1 font-bold">${i.qty}</td></tr>`).join(''); 
        document.getElementById('strukTotalPrint').innerText = formatRupiah(total); document.getElementById('strukMetodePrint').innerText = metodeBayarActive.toUpperCase();
        
        if(metodeBayarActive === 'QRIS') { document.getElementById('areaStrukTunai').classList.add('hidden'); document.getElementById('areaStrukKembali').classList.add('hidden'); } 
        else { document.getElementById('areaStrukTunai').classList.remove('hidden'); document.getElementById('areaStrukKembali').classList.remove('hidden'); document.getElementById('strukTunaiPrint').innerText = formatRupiah(b); document.getElementById('strukKembaliPrint').innerText = formatRupiah(b - total); }
        
        lastTrxData = {no, total, bayar: b, kembali: b-total, items: [...keranjang], metode: metodeBayarActive, kasir: kasir}; 
        document.getElementById('modalKembalian').innerText = formatRupiah(b - total); document.getElementById('modalSuksesBayar').classList.remove('hidden');
    } catch(e) { showAlert('Koneksi Gagal', 'Gagal memproses transaksi.', 'error'); }
}
function cetakStrukKasir() { document.getElementById('modalSuksesBayar').classList.add('hidden'); const areaStruk = document.getElementById('areaStruk'); doPrintAction(areaStruk, () => { document.getElementById('modalSuksesBayar').classList.remove('hidden'); }); }
function kirimWA(){
    let t = `*${profilToko.nama_toko}*\nNo: ${lastTrxData.no}\n-----------------\n`; lastTrxData.items.forEach(i => t += `• ${i.nama}\n  ${i.qty} x ${formatRupiah(i.harga_jual)}\n`); t += `-----------------\n*Total: ${formatRupiah(lastTrxData.total)}*\nMetode: ${lastTrxData.metode.toUpperCase()}\n`;
    if(lastTrxData.metode === 'Tunai') { t += `Bayar: ${formatRupiah(lastTrxData.bayar)}\nKembali: ${formatRupiah(lastTrxData.kembali)}\n`; } t += `\n_Terima kasih!_`; window.open(`https://wa.me/?text=${encodeURIComponent(t)}`,'_blank');
}
function selesaiBayar(){ document.getElementById('modalSuksesBayar').classList.add('hidden'); keranjang = []; document.getElementById('uangBayar').value = ''; pilihMetode('Tunai'); renderKeranjang(); loadKatalogKasir(); loadDataLaporan(); }

// ================= FITUR LAPORAN =================
async function loadDataLaporan(){
    try { const res = await fetch('/api/transaksi'); const d = await res.json(); semuaTransaksi = Array.isArray(d) ? d : []; renderLaporan(currentLaporanType || 'harian'); } 
    catch(e) { semuaTransaksi = []; renderLaporan('harian'); }
}
function renderLaporan(tipe){
    currentLaporanType = tipe; 
    document.querySelectorAll('.btn-filter-lap').forEach(b => { b.classList.replace('bg-green-600','bg-gray-200'); b.classList.replace('text-white','text-gray-700'); }); 
    const aBtn = document.getElementById('btnLap'+tipe.charAt(0).toUpperCase()+tipe.slice(1)); if(aBtn) { aBtn.classList.replace('bg-gray-200','bg-green-600'); aBtn.classList.replace('text-gray-700','text-white'); }
    const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`; const thisMonthStr = `${y}-${m}`;

    if(tipe === 'harian'){
        document.getElementById('filterBulan').style.setProperty('display', 'none', 'important'); 
        document.getElementById('wrapFilterHari').style.setProperty('display', 'flex', 'important'); 
        document.getElementById('areaCariStruk').style.setProperty('display', 'block', 'important'); 
        if(!document.getElementById('filterMulai').value) document.getElementById('filterMulai').value = todayStr; 
        if(!document.getElementById('filterSelesai').value) document.getElementById('filterSelesai').value = todayStr; 
        const startDate = new Date(document.getElementById('filterMulai').value); startDate.setHours(0,0,0,0); const endDate = new Date(document.getElementById('filterSelesai').value); endDate.setHours(23,59,59,999);
        dataTampilLaporan = semuaTransaksi.filter(t => { if(!t.tanggal) return false; const tTime = new Date(t.tanggal).getTime(); return tTime >= startDate.getTime() && tTime <= endDate.getTime(); }); 
        const fMulai = startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); const fSelesai = endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        document.getElementById('teksFilterLaporan').innerText = startDate.getTime() === endDate.getTime() ? `LAPORAN: ${fMulai}` : `LAPORAN: ${fMulai} - ${fSelesai}`;
    } else {
        document.getElementById('wrapFilterHari').style.setProperty('display', 'none', 'important'); 
        document.getElementById('filterBulan').style.setProperty('display', 'block', 'important'); 
        document.getElementById('areaCariStruk').style.setProperty('display', 'none', 'important'); 
        if(!document.getElementById('filterBulan').value) document.getElementById('filterBulan').value = thisMonthStr; 
        const selMonth = document.getElementById('filterBulan').value;
        dataTampilLaporan = semuaTransaksi.filter(t => { if(!t.tanggal) return false; const tDate = new Date(t.tanggal); return `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}` === selMonth; }); 
        document.getElementById('teksFilterLaporan').innerText = `LAPORAN BULANAN: ${selMonth}`;
    } 
    gambarTabelLaporan(dataTampilLaporan);
}

function gambarTabelLaporan(data){
    let o=0, m=0; const list = document.getElementById('listLaporan'); const thead = document.getElementById('theadLaporan'); list.innerHTML = ''; 
    if(currentLaporanType === 'harian') {
        if(thead) thead.innerHTML = '<th class="p-4">Struk / Kasir</th><th class="p-4 text-right">Rincian</th><th class="p-4 text-center">Audit</th>';
        if(!data || data.length === 0) { list.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-bold">Data kosong.</td></tr>`; } 
        else {
            data.forEach(t => {
                const tb = parseFloat(t.total_bayar) || 0; const tm = parseFloat(t.total_modal) || 0; o += tb; m += tm; 
                list.innerHTML += `<tr class="border-b hover:bg-slate-50 transition"><td class="p-4"><div class="font-bold text-blue-600 font-mono text-[10px] uppercase">${t.no_struk}</div><div class="text-[9px] text-slate-400 font-bold mt-0.5">${new Date(t.tanggal).toLocaleString('id-ID')}</div><div class="text-[8px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded border mt-1 uppercase font-bold tracking-widest">Kasir: ${t.kasir || 'Admin'} • ${t.metode_bayar || 'TUNAI'}</div></td><td class="p-4 text-right"><div class="font-bold text-slate-800 text-xs">${formatRupiah(tb)}</div><div class="text-[9px] text-green-600 font-black mt-0.5">Laba: ${formatRupiah(tb-tm)}</div></td><td class="p-4 text-center"><button onclick="lihatDetailStruk('${t.id}','${t.no_struk}','${t.tanggal}',${tb},'${t.kasir || 'Admin'}','${t.metode_bayar || 'TUNAI'}')" class="bg-slate-100 border text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 shadow-sm active:scale-95">Audit</button></td></tr>`;
            }); 
        }
    } else {
        if(thead) thead.innerHTML = '<th class="p-4">Periode Bulan</th><th class="p-4 text-right">Total Modal</th><th class="p-4 text-right">Omzet & Laba</th>';
        if(!data || data.length === 0) { list.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-bold">Data kosong.</td></tr>`; } 
        else {
            data.forEach(t => { o += parseFloat(t.total_bayar) || 0; m += parseFloat(t.total_modal) || 0; });
            const valBulan = document.getElementById('filterBulan').value; const parts = valBulan.split('-'); const monthName = new Date(parts[0], parts[1] - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            list.innerHTML = `<tr class="border-b hover:bg-slate-50 transition"><td class="p-4"><div class="font-bold text-blue-600 text-sm uppercase">${monthName}</div><div class="text-[9px] text-slate-400 font-bold mt-0.5">Akumulasi ${data.length} Transaksi</div></td><td class="p-4 text-right font-bold text-slate-700 text-xs">${formatRupiah(m)}</td><td class="p-4 text-right"><div class="font-bold text-slate-800 text-xs">Omzet: ${formatRupiah(o)}</div><div class="text-[10px] text-green-600 font-black mt-0.5">Laba: ${formatRupiah(o-m)}</div></td></tr>`;
        }
    }
    document.getElementById('lapOmzet').innerText = formatRupiah(o); document.getElementById('lapModal').innerText = formatRupiah(m); document.getElementById('lapLaba').innerText = formatRupiah(o-m);
}

async function lihatDetailStruk(id, no, tgl, tot, kas, metode) {
    try {
        const res = await fetch('/api/transaksi/detail/' + id); const d = await res.json(); memoriRevisi = { id, no, items: d }; 
        let h = `<div class='mb-4 text-center border-b pb-3'><div class='font-black text-sm uppercase text-slate-800 tracking-tight'>${profilToko.nama_toko||''}</div><div class='text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest'>${new Date(tgl).toLocaleString('id-ID')}</div><div class='text-[10px] bg-blue-50 text-blue-600 inline-block px-2 py-0.5 rounded font-mono font-bold mt-1 border border-blue-100'>${no}</div><div class='text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest'>Kasir: ${kas} • ${metode}</div></div><table class='w-full text-xs mb-3'><tbody class='divide-y divide-slate-100 border-t border-b'>`; 
        d.forEach(i => h += `<tr><td class='py-2.5'><div class='font-bold text-slate-700'>${i.nama_barang}</div><div class='text-[9px] text-slate-500 font-medium'>@${formatRupiah(i.harga)}</div></td><td class='py-2.5 text-center text-[10px] font-bold text-blue-600'>x${i.qty}</td><td class='py-2.5 text-right font-black text-slate-800'>${formatRupiah(i.subtotal)}</td></tr>`); 
        h += `</tbody></table><div class='flex justify-between font-black text-sm pt-1 text-slate-800'><span>TOTAL</span><span class='text-blue-600'>${formatRupiah(tot)}</span></div>`; 
        const reprintData = { no: no, tanggal: new Date(tgl).toLocaleString('id-ID'), kasir: kas, metode: metode, total: tot, items: d };
        const reprintBtnHTML = `<button onclick='cetakUlangStruk(${JSON.stringify(reprintData)})' class="bg-blue-500 text-white font-bold py-3 text-sm rounded-xl shadow-md hover:bg-blue-600 transition uppercase tracking-widest active:scale-95 mb-2 w-full">🖨️ Print Ulang Struk</button>`;
        document.getElementById('isiModalStruk').innerHTML = h; 
        document.querySelector('#modalStrukLaporan .flex-col.gap-2').innerHTML = reprintBtnHTML + `<button onclick="revisiTransaksi()" class="bg-orange-500 text-white font-bold py-3 text-sm rounded-xl shadow-md hover:bg-orange-600 transition uppercase tracking-widest active:scale-95">Hapus & Void (Retur)</button><button onclick="tutupModalStruk()" class="bg-slate-100 text-slate-600 font-bold py-3 text-sm rounded-xl hover:bg-slate-200 transition">Tutup Dialog</button>`;
        document.getElementById('modalStrukLaporan').classList.remove('hidden');
    } catch(e) { showAlert('Error', 'Gagal memuat rincian.', 'error'); }
}
function cetakUlangStruk(data) { document.getElementById('strukTanggal').innerText = data.tanggal; document.getElementById('strukNomor').innerText = data.no + " (REPRINT)"; document.getElementById('strukNamaKasir').innerText = data.kasir.toUpperCase(); document.getElementById('strukItem').innerHTML = data.items.map(i=>`<tr><td class="pb-1">${i.nama_barang}</td><td align="right" class="pb-1 font-bold">${i.qty}</td></tr>`).join(''); document.getElementById('strukTotalPrint').innerText = formatRupiah(data.total); document.getElementById('strukMetodePrint').innerText = data.metode.toUpperCase(); if(data.metode.toUpperCase() === 'QRIS') { document.getElementById('areaStrukTunai').classList.add('hidden'); document.getElementById('areaStrukKembali').classList.add('hidden'); } else { document.getElementById('areaStrukTunai').classList.remove('hidden'); document.getElementById('areaStrukKembali').classList.remove('hidden'); document.getElementById('strukTunaiPrint').innerText = formatRupiah(data.total); document.getElementById('strukKembaliPrint').innerText = "Rp0"; } doPrintAction(document.getElementById('areaStruk'), () => {}); }
function tutupModalStruk(){ document.getElementById('modalStrukLaporan').classList.add('hidden'); }
async function revisiTransaksi(){ showConfirm('Void Transaksi?', 'Transaksi ini akan dibatalkan. Lanjutkan?', async () => { try { await fetch('/api/transaksi/' + memoriRevisi.id, {method:'DELETE'}); tutupModalStruk(); showTab('kasir'); renderKeranjang(); await loadKatalogKasir(); loadDataLaporan(); showAlert("Berhasil", "Transaksi di-Void!", "success"); } catch(e) {} }); }
function pencarianStruk(){ const kw = document.getElementById('cariStruk').value.toLowerCase(); gambarTabelLaporan(dataTampilLaporan.filter(t => (t.no_struk||'').toLowerCase().includes(kw))); }
function cetakLaporanPDF(){ if(!dataTampilLaporan.length) return showAlert('Laporan Kosong', 'Tidak ada data untuk dicetak.', 'error'); let h = `<div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px;"><h2>${profilToko.nama_toko || 'TOKO'}</h2><p style="font-weight:bold;">${document.getElementById('teksFilterLaporan').innerText}</p></div><table><thead><tr>`; let o=0, m=0; if(currentLaporanType === 'harian') { h += `<th>Struk</th><th>Kasir/Metode</th><th>Omzet</th><th>Laba</th></tr></thead><tbody>`; dataTampilLaporan.forEach(t => { o+=parseFloat(t.total_bayar||0); m+=parseFloat(t.total_modal||0); h+=`<tr><td>${t.no_struk}</td><td style="text-transform:uppercase;">${t.kasir||'Admin'} - ${t.metode_bayar||'TUNAI'}</td><td align="right">${formatRupiah(t.total_bayar)}</td><td align="right">${formatRupiah((t.total_bayar||0)-(t.total_modal||0))}</td></tr>`; }); h += `<tr><th colspan="2">TOTAL KESELURUHAN</th><th align="right" style="font-size:13px;">${formatRupiah(o)}</th><th align="right" style="font-size:13px;">${formatRupiah(o-m)}</th></tr>`; } else { h += `<th>Periode Bulan</th><th style="text-align:right;">Total Modal</th><th style="text-align:right;">Total Omzet</th><th style="text-align:right;">Laba Bersih</th></tr></thead><tbody>`; dataTampilLaporan.forEach(t => { o+=parseFloat(t.total_bayar||0); m+=parseFloat(t.total_modal||0); }); const valBulan = document.getElementById('filterBulan').value; const parts = valBulan.split('-'); const monthName = new Date(parts[0], parts[1] - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); h+=`<tr><td>${monthName.toUpperCase()}</td><td align="right">${formatRupiah(m)}</td><td align="right">${formatRupiah(o)}</td><td align="right">${formatRupiah(o-m)}</td></tr>`; } h += `</tbody></table><p style="text-align:right; font-size:10px; margin-top:10px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>`; const areaLaporan = document.getElementById('areaPrintLaporan'); areaLaporan.innerHTML = h; doPrintAction(areaLaporan, null); }

// ================= FITUR PENGGUNA =================
async function loadUsers(){
    try {
        const res = await fetch('/api/users'); const d = await res.json(); 
        document.getElementById('listPengguna').innerHTML = (Array.isArray(d)?d:[]).map(u => `<tr class="border-b hover:bg-slate-50 transition"><td class="p-4 font-bold text-slate-800">${u.username}</td><td class="p-4">${u.username === 'owner' || u.role === 'admin' ? '<span class="text-purple-600 font-black text-[9px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200 shadow-sm">SUPER ADMIN</span>' : u.role.split(',').map(r=>`<span class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1 inline-block shadow-sm">${r}</span>`).join('')}</td><td class="p-4 text-center">${u.username !== 'owner' ? `<button onclick="siapkanEditUser('${u.id}','${u.username}','${u.role}')" class="text-blue-600 font-bold mr-4 text-[10px] uppercase hover:underline">Edit</button><button onclick="hapusUser('${u.id}','${u.username}')" class="text-red-500 font-bold text-[10px] uppercase hover:underline">Hapus</button>` : `<span class="text-slate-300 text-[10px] italic font-bold">LOCKED</span>`}</td></tr>`).join('');
    } catch(e){}
}
function siapkanEditUser(id, username, role) { document.getElementById('addUserId').value = id; document.getElementById('addUserUsername').value = username; document.getElementById('addUserUsername').disabled = true; document.getElementById('addUserUsername').classList.add('opacity-50'); document.getElementById('addUserPassword').value = ''; const arrRole = role.split(','); document.querySelectorAll('.akses-cb').forEach(cb => { cb.checked = arrRole.includes(cb.value) || cb.value === 'kasir' || role === 'owner' || role === 'admin'; }); isEditUserMode = true; document.getElementById('btnSimpanUser').innerText = 'Update Akun'; document.getElementById('btnSimpanUser').classList.replace('bg-blue-600', 'bg-orange-500'); document.getElementById('btnBatalEditUser').classList.remove('hidden'); }
function batalEditUser() { document.getElementById('addUserId').value = ''; document.getElementById('addUserUsername').value = ''; document.getElementById('addUserUsername').disabled = false; document.getElementById('addUserUsername').classList.remove('opacity-50'); document.getElementById('addUserPassword').value = ''; document.querySelectorAll('.akses-cb').forEach(cb => { cb.checked = (cb.value === 'kasir'); }); isEditUserMode = false; document.getElementById('btnSimpanUser').innerText = 'Simpan Akun'; document.getElementById('btnSimpanUser').classList.replace('bg-orange-500', 'bg-blue-600'); document.getElementById('btnBatalEditUser').classList.add('hidden'); }
async function simpanUser(){ const u = document.getElementById('addUserUsername').value.replace(/\s+/g, ''); const p = document.getElementById('addUserPassword').value; const r = Array.from(document.querySelectorAll('.akses-cb:checked')).map(x=>x.value).join(','); if(!u) return showAlert('Peringatan', 'Username tidak boleh kosong.', 'error'); if(!isEditUserMode && !p) return showAlert('Peringatan', 'Password wajib diisi.', 'error'); try { const res = await fetch(isEditUserMode ? `/api/users/${document.getElementById('addUserId').value}` : '/api/users', { method: isEditUserMode ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p, role:r}) }); if(!res.ok) throw new Error(); showAlert('Sukses', 'Akun berhasil disimpan.', 'success'); batalEditUser(); loadUsers(); } catch(e) { showAlert('Error', 'Username mungkin sudah terpakai.', 'error'); } }
async function hapusUser(id, name){ if (name === localStorage.getItem('userName')) return showAlert('Ditolak', 'Tidak bisa menghapus akun sendiri.', 'error'); if (name === 'owner') return showAlert('Ditolak', 'Akun owner tidak bisa dihapus.', 'error'); showConfirm('Hapus Akun?', `Cabut akses untuk ${name}?`, async () => { try { await fetch('/api/users/'+id, {method:'DELETE'}); loadUsers(); showAlert('Terhapus', `Akun berhasil dihapus.`, 'success'); } catch(e) {} }); }
