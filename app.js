/* =========================================================================
   app.js — ໜ້າຮ້ານ (index.html)
   ດຶງຂໍ້ມູນສິນຄ້າ + ອັດຕາແລກປ່ຽນ ໂດຍກົງຈາກ GitHub Raw URL (read-only, ບໍ່ຕ້ອງ token)
   ========================================================================= */

let allProducts = [];
let exchangeRate = 600;      // ກີບ ÷ exchangeRate = ບາດ
let thbToLakRate = 600;      // ບາດ × thbToLakRate = ກີບ
let currentCurrency = 'LAK';
let currentLang = 'LO';
let currentCategory = 'all';

window.onload = function () { loadData(); };

async function loadData() {
  try {
    const [productsRes, settingsRes] = await Promise.all([
      fetch(ghRawUrl(CONFIG.PRODUCTS_PATH)),
      fetch(ghRawUrl(CONFIG.SETTINGS_PATH))
    ]);

    if (!productsRes.ok) throw new Error('ไม่พบ ' + CONFIG.PRODUCTS_PATH);
    allProducts = await productsRes.json();

    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      exchangeRate = Number(settings.exchangeRate) || 600;
      thbToLakRate = Number(settings.thbToLakRate) || 600;
    }

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';

    applyFilters();
    openDeepLinkedProductIfAny();
  } catch (err) {
    console.error('Error loading data:', err);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.innerText = 'ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນ (ກວດ config.js ວ່າຕັ້ງ GITHUB_OWNER/REPO ຖືກຕ້ອງບໍ່)';
  }
}

function toggleCurrency() {
  currentCurrency = currentCurrency === 'LAK' ? 'THB' : 'LAK';
  document.getElementById('currencyBtn').innerText = currentCurrency === 'LAK' ? '₭ LAK' : '฿ THB';
  applyFilters();
}

function toggleLang() {
  currentLang = currentLang === 'LO' ? 'EN' : 'LO';
  document.getElementById('langBtn').innerText = currentLang === 'LO' ? 'EN' : 'ລາວ';
  updateUIText();
  applyFilters();
}

function updateUIText() {
  if (currentLang === 'EN') {
    document.getElementById('brandSub').innerText = 'Quality Secondhand & Service Hub';
    document.getElementById('searchInput').placeholder = 'Search by name, model like M1, Air, Pro, Pioneer...';
    document.getElementById('lblYear').innerText = 'Year';
  } else {
    document.getElementById('brandSub').innerText = 'ສິນຄ້າມືສອງຄຸນນະພາບ ມືໜຶ່ງຄຸ້ມຄ່າ';
    document.getElementById('searchInput').placeholder = 'ຄົ້ນຫາຊື່ສິນຄ້າ, ລຸ້ນເຊັ່ນ M1, Air, Pro, Pioneer...';
    document.getElementById('lblYear').innerText = 'YEAR (ປີຜະລິດ)';
  }
}

// ຟັງຊັນຊ່ວຍ: ກວດຄຳສຳຄັນຈາກຫຼາຍ field (subType, type, title, spec, detail...)
function matchField(p, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const hay = ((p.subType || '') + ' ' + (p.type || '') + ' ' +
               (p.title || '') + ' ' + (p.spec || '') + ' ' +
               (p.detail || '') + ' ' + (p.desc || '')).toLowerCase();
  return keywords.some(k => hay.includes(k.toLowerCase()));
}

function filterCategory(cat, btnEl) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.className = "cat-btn btn-press bg-white text-slate-600 hover:bg-slate-100 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap border border-slate-100 shadow-sm transition";
  });
  if (btnEl) btnEl.className = "cat-btn btn-press bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap shadow-md transition";

  // ຣີເຊັດຄ່າ dropdown ທັງໝົດ
  ['filterRam', 'filterSsd', 'filterYear', 'filterAccType', 'filterAccWatt', 'filterDjSize', 'filterSwType']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // ສະແດງສະເພາະ dropdown ຂອງໝວດທີ່ເລືອກ
  document.getElementById('macFilterSection').style.display = (cat === 'Macbook') ? 'grid' : 'none';
  document.getElementById('accFilterSection').style.display = (cat === 'Accessories') ? 'grid' : 'none';
  document.getElementById('djFilterSection').style.display = (cat === 'DJ') ? 'grid' : 'none';
  document.getElementById('swFilterSection').style.display = (cat === 'Software') ? 'grid' : 'none';

  applyFilters();
}

function applyFilters() {
  let filtered = allProducts;
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);

  const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
  if (keyword) filtered = filtered.filter(p =>
    p.title.toLowerCase().includes(keyword) ||
    p.category.toLowerCase().includes(keyword) ||
    p.id.toLowerCase().includes(keyword));

  // ---- MacBook ----
  if (currentCategory === 'Macbook') {
    const ram = document.getElementById('filterRam').value;
    const ssd = document.getElementById('filterSsd').value;
    const year = document.getElementById('filterYear').value;
    if (ram) filtered = filtered.filter(p => (p.ram || '').toString().includes(ram));
    if (ssd) filtered = filtered.filter(p => (p.ssd || '').toString().includes(ssd));
    if (year) filtered = filtered.filter(p => (p.year || '').toString().includes(year));
  }

  // ---- ສາຍສາກ / ອຸປະກອນ ----
  if (currentCategory === 'Accessories') {
    const at = document.getElementById('filterAccType').value;
    const aw = document.getElementById('filterAccWatt').value;
    const typeKw = {
      '2012down': ['2012', 'magsafe 1', 'magsafe1', 'ລົງມາ', 'ປີ 2012'],
      '2013-2015': ['2013', '2014', '2015', 'magsafe 2', 'magsafe2'],
      'usbc': ['usb-c', 'usbc', 'type-c', 'type c', '2016', '2017', '2018', '2019', '2020']
    };
    if (at) filtered = filtered.filter(p => matchField(p, typeKw[at] || [at]));
    if (aw) filtered = filtered.filter(p => matchField(p, [aw + 'w', aw + ' w', aw + ' watt', aw]));
  }

  // ---- ເຄື່ອງ DJ ----
  if (currentCategory === 'DJ') {
    const ds = document.getElementById('filterDjSize').value;
    const djKw = {
      'big': ['ໃຫຍ່', 'ໃຫ່ຍ', 'big', 'large', 'xdj', 'opus', 'ddj-flx10', 'cdj'],
      'small': ['ນ້ອຍ', 'small', 'mini', 'ddj-200', 'ddj-400', 'flx4']
    };
    if (ds) filtered = filtered.filter(p => matchField(p, djKw[ds] || [ds]));
  }

  // ---- ລົງໂປຮແກຣມ ----
  if (currentCategory === 'Software') {
    const st = document.getElementById('filterSwType').value;
    const swKw = {
      'macos': ['macos', 'mac os', 'os x', 'ລະບົບ', 'ระบบ', 'sonoma', 'ventura', 'sequoia'],
      'office': ['office', 'word', 'excel', 'powerpoint', 'microsoft'],
      'adobe': ['adobe', 'photoshop', 'premiere', 'illustrator', 'lightroom', 'after effect'],
      'dj': ['serato', 'rekordbox', 'virtual dj', 'traktor'],
      'music': ['logic', 'ableton', 'fl studio', 'cubase', 'ຕັດຕໍ່', 'ດົນຕີ'],
      'other': ['other', 'ອື່ນ']
    };
    if (st) filtered = filtered.filter(p => matchField(p, swKw[st] || [st]));
  }

  // ຈັດຮຽງລາຄາ ຕ່ຳ -> ສູງ
  filtered = filtered.slice().sort((a, b) => Number(a.priceLAK) - Number(b.priceLAK));

  renderProducts(filtered);
}

function priceInCurrentCurrency(lakVal, thbVal) {
  if (currentCurrency === 'THB') {
    if (thbVal && thbVal > 0) return thbVal;
    return Math.round((lakVal || 0) / exchangeRate);
  }
  if (lakVal && lakVal > 0) return lakVal;
  return Math.round((thbVal || 0) * thbToLakRate);
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (products.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400 text-xs">${currentLang === 'EN' ? 'No products found' : 'ບໍ່ພົບສິນຄ້າຕາມເງື່ອນໄຂທີ່ເລືອກ'}</div>`;
    return;
  }

  grid.innerHTML = products.map((p, idx) => {
    let isSold = p.status === 'Sold';
    let priceVal = priceInCurrentCurrency(p.priceLAK, p.priceTHB);
    let priceFormatted = Number(priceVal).toLocaleString();
    let oldPriceVal = priceInCurrentCurrency(p.oldPriceLAK, p.oldPriceTHB);
    let currencySymbol = currentCurrency === 'THB' ? '฿' : '₭';

    const statusText = p.status === 'Ready' ? (currentLang === 'EN' ? 'Ready' : 'ພ້ອມຂາຍ') : (p.status === 'Reserved' ? (currentLang === 'EN' ? 'Reserved' : 'ຈອງແລ້ວ') : (currentLang === 'EN' ? 'Sold' : 'ຂາຍແລ້ວ'));
    const statusColor = p.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : (p.status === 'Reserved' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600');
    let mainImg = (p.images && p.images.length > 0 && p.images[0]) ? p.images[0] : 'https://placehold.co/400x300?text=No+Image';
    const delay = Math.min(idx, 11) * 45;

    return `
      <div class="product-card group bg-white rounded-3xl-custom shadow-sm overflow-hidden flex flex-col justify-between cursor-pointer" style="animation-delay:${delay}ms" onclick="openProductModal('${p.id}')">
        <div>
          <div class="relative h-44 bg-slate-100 overflow-hidden">
            <img src="${mainImg}" alt="${p.title}" class="card-img w-full h-full object-cover">
            <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-semibold ${statusColor} bg-white/90 backdrop-blur-md">${statusText}</span>
            <span class="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900/60 text-white backdrop-blur-md">ID ${p.id}</span>
          </div>
          <div class="p-4">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">${p.category} · KB ${p.keyboard || 'TH'}</span>
            <div class="flex items-center gap-1.5 mt-1">
              <h3 class="font-bold text-slate-800 text-sm line-clamp-1">${p.title}</h3>
              ${p.color ? `<span class="shrink-0 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">${p.color}</span>` : ''}
            </div>
            ${p.category === 'Macbook' ? `
              <p class="text-[11px] text-slate-400 font-medium mt-1.5">${p.cpu ? p.cpu + ' · ' : ''}RAM ${p.ram || '-'}GB · SSD ${p.ssd || '-'}GB · ${p.screenSize || '-'}</p>
            ` : ''}
          </div>
        </div>
        <div class="p-4 pt-3 border-t border-slate-50 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 block">${currentCurrency === 'THB' ? 'ລາຄາ (บาท)' : 'ລາຄາ (ກີບ)'}</span>
            ${isSold ? `<span class="text-slate-400 font-bold text-sm italic">ສິນຄ້ານີ້ຂາຍແລ້ວ</span>` : `
              <div class="flex items-baseline gap-2">
                <span class="text-rose-600 font-bold text-lg">${priceFormatted} ${currencySymbol}</span>
                ${oldPriceVal > 0 ? `<span class="text-slate-300 line-through text-xs">${Number(oldPriceVal).toLocaleString()}</span>` : ''}
              </div>
            `}
          </div>
          <div class="w-9 h-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white group-hover:translate-x-0.5">
            <i class="fas fa-arrow-right text-xs"></i>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Modal ສະແດງລາຍລະອຽດ + Slider ຮູບ (ບໍ່ເປີດແທັບໃໝ່) ----------
let activeImages = [];
let currentSlideIdx = 0;

function openProductModal(id) {
  const p = allProducts.find(x => x.id.toString() === id.toString());
  if (!p) return;
  activeImages = (p.images && p.images.length > 0) ? p.images : ['https://placehold.co/400x300?text=No+Image'];
  currentSlideIdx = 0;

  let priceVal = priceInCurrentCurrency(p.priceLAK, p.priceTHB);
  let priceFormatted = Number(priceVal).toLocaleString();
  let oldPriceVal = priceInCurrentCurrency(p.oldPriceLAK, p.oldPriceTHB);
  let currencySymbol = currentCurrency === 'THB' ? '฿' : '₭';

  const statusText = p.status === 'Ready' ? (currentLang === 'EN' ? 'Ready' : 'ພ້ອມຂາຍ') : (p.status === 'Reserved' ? (currentLang === 'EN' ? 'Reserved' : 'ຈອງແລ້ວ') : (currentLang === 'EN' ? 'Sold' : 'ຂາຍແລ້ວ'));
  const statusColor = p.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : (p.status === 'Reserved' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600');

  let modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <div class="space-y-4">
      <div class="relative h-64 bg-slate-100 rounded-2xl overflow-hidden">
        <img id="sliderImg" src="${activeImages[0]}" class="w-full h-full object-cover">
        <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-semibold ${statusColor} bg-white/90 backdrop-blur-md">${statusText}</span>
        <span class="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900/60 text-white backdrop-blur-md">ID ${p.id}</span>
        ${activeImages.length > 1 ? `
          <button onclick="prevSlide()" class="btn-press absolute left-2 top-1/2 -translate-y-1/2 bg-slate-900/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-900"><i class="fas fa-chevron-left text-xs"></i></button>
          <button onclick="nextSlide()" class="btn-press absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-900"><i class="fas fa-chevron-right text-xs"></i></button>
          <div class="absolute bottom-3 right-3 bg-slate-900/70 text-white px-2.5 py-1 rounded-full text-[10px]" id="slideCounter">1 / ${activeImages.length}</div>
        ` : ''}
      </div>

      ${activeImages.length > 1 ? `
      <div class="flex gap-2 overflow-x-auto pb-1">
        ${activeImages.map((img, idx) => `
          <img src="${img}" onclick="setSlide(${idx})" class="thumb-img w-14 h-14 object-cover rounded-xl cursor-pointer ring-2 transition ${idx === 0 ? 'ring-slate-900' : 'ring-transparent'} hover:ring-slate-300">
        `).join('')}
      </div>` : ''}

      <div>
        <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span class="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">${p.category}</span>
          ${p.category === 'Macbook' ? `<span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-wider">KB ${p.keyboard || 'TH'}</span>` : ''}
          ${p.color ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">${p.color}</span>` : ''}
        </div>
        <h3 class="font-bold text-slate-800 text-lg leading-snug">${p.title}</h3>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        ${p.category === 'Macbook' ? `
          <div class="bg-slate-50 rounded-2xl p-3">
            <span class="text-[10px] text-slate-400 flex items-center gap-1.5"><i class="fas fa-memory"></i> CPU / RAM / SSD</span>
            <p class="font-semibold text-xs text-slate-700 mt-1">${[p.cpu, (p.ram ? p.ram + ' GB' : ''), (p.ssd ? p.ssd + ' GB' : '')].filter(Boolean).join(' / ') || '-'}</p>
          </div>
          <div class="bg-slate-50 rounded-2xl p-3">
            <span class="text-[10px] text-slate-400 flex items-center gap-1.5"><i class="fas fa-calendar-days"></i> ປີຜະລິດ</span>
            <p class="font-semibold text-xs text-slate-700 mt-1">${p.year || '-'}</p>
          </div>
        ` : ''}
        <div class="bg-slate-50 rounded-2xl p-3">
          <span class="text-[10px] text-slate-400 flex items-center gap-1.5"><i class="fas fa-display"></i> ຂະໜາດໜ້າຈໍ</span>
          <p class="font-semibold text-xs text-slate-700 mt-1">${p.screenSize || '-'}</p>
        </div>
        <div class="bg-slate-50 rounded-2xl p-3">
          <span class="text-[10px] text-slate-400 flex items-center gap-1.5"><i class="fas fa-battery-half"></i> ແບັດ / ຮອບສາກ</span>
          <p class="font-semibold text-xs text-slate-700 mt-1">${p.battery || '-'}</p>
        </div>
      </div>

      <div class="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-4">
        <span class="text-[10px] text-slate-400 block">ລາຄາສິນຄ້າ</span>
        ${p.status === 'Sold' ? `<span class="text-slate-400 font-bold text-sm italic">ສິນຄ້ານີ້ຂາຍແລ້ວ</span>` : `
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-rose-600 font-extrabold text-2xl">${priceFormatted} ${currencySymbol}</span>
            ${oldPriceVal > 0 ? `<span class="text-slate-300 line-through text-sm">${Number(oldPriceVal).toLocaleString()}</span>` : ''}
          </div>
        `}
      </div>

      <div>
        <div class="flex gap-2">
          <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=ສົນໃຈສິນຄ້າລະຫັດ%20${p.id}:%20${encodeURIComponent(p.title)}" target="_blank"
             class="btn-press flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 pl-3 pr-5 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2.5">
            <span class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i class="fab fa-whatsapp text-base"></i></span>
            ສັ່ງຊື້ຜ່ານ WhatsApp
          </a>
          <button onclick="openShareModal('${p.id}')" title="ແຊຣ໌ສິນຄ້ານີ້"
             class="btn-press shrink-0 w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center shadow-sm transition">
            <i class="fas fa-share-nodes"></i>
          </button>
        </div>
        <p class="text-center text-[10px] text-slate-400 mt-2">ເບີແອດມິນ: ${CONFIG.WHATSAPP_NUMBER}</p>
      </div>
    </div>
  `;
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() { document.getElementById('productModal').classList.add('hidden'); }

function setSlide(idx) {
  currentSlideIdx = idx;
  document.getElementById('sliderImg').src = activeImages[currentSlideIdx];
  document.getElementById('slideCounter').innerText = `${currentSlideIdx + 1} / ${activeImages.length}`;
  document.querySelectorAll('.thumb-img').forEach((el, i) => {
    el.classList.toggle('ring-slate-900', i === currentSlideIdx);
    el.classList.toggle('ring-transparent', i !== currentSlideIdx);
  });
}
function nextSlide() {
  currentSlideIdx = (currentSlideIdx + 1) % activeImages.length;
  setSlide(currentSlideIdx);
}
function prevSlide() {
  currentSlideIdx = (currentSlideIdx - 1 + activeImages.length) % activeImages.length;
  setSlide(currentSlideIdx);
}

// ---------- Warranty Modal (ຄິດໄລ່ຝັ່ງ Client ຈາກຂໍ້ມູນສິນຄ້າໂດຍກົງ) ----------
function openWarrantyModal() { document.getElementById('warrantyModal').classList.remove('hidden'); }
function closeWarrantyModal() { document.getElementById('warrantyModal').classList.add('hidden'); }

function computeWarrantyText(status, soldDateVal, warrantyDays) {
  if (status !== 'Sold') return 'ຍັງບໍ່ໄດ້ຂາຍ (ຍັງບໍ່ເລີ່ມນັບປະກັນ)';
  if (!warrantyDays || warrantyDays <= 0) return 'ບໍ່ມີປະກັນ';
  if (!soldDateVal) return 'ບໍ່ມີຂໍ້ມູນວັນທີ່ຂາຍ';

  const soldDate = new Date(soldDateVal);
  const expiryDate = new Date(soldDate.getTime());
  expiryDate.setDate(expiryDate.getDate() + Number(warrantyDays));

  const expiryText = expiryDate.toLocaleDateString('en-GB'); // dd/mm/yyyy
  const isActive = expiryDate.getTime() >= new Date().getTime();

  return expiryText + (isActive ? ' (ຍັງຢູ່ໃນໄລຍະປະກັນ)' : ' (ໝົດອາຍຸປະກັນແລ້ວ)');
}

function checkWarranty() {
  const code = document.getElementById('warrantyInputCode').value.trim();
  const box = document.getElementById('warrantyResultBox');
  if (!code) { alert('ກະລຸນາໃສ່ລະຫັດສິນຄ້າ'); return; }

  const p = allProducts.find(x => x.id.toString().trim() === code);
  if (!p) {
    box.innerHTML = `<p class="text-xs text-rose-500 mt-2">ບໍ່ພົບເລກລະຫັດສິນຄ້ານີ້ໃນລະບົບ</p>`;
    return;
  }

  const warrantyText = computeWarrantyText(p.status, p.soldDate, p.warrantyDays);
  box.innerHTML = `
    <div class="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 text-xs space-y-1.5 mt-2">
      <p><b>ລະຫັດ:</b> ${p.id} (${p.title})</p>
      <p><b>ສະຖານະ:</b> <span class="text-emerald-600 font-semibold">${p.status}</span></p>
      <p><b>ວັນໝົດປະກັນ:</b> <span class="text-indigo-600 font-semibold">${warrantyText}</span></p>
      <p><b>ປະຫວັດການສ້ອມແຊມ:</b> ${p.repairHistory || 'ບໍ່ມີປະຫວັດການສ້ອມແຊມ'}</p>
    </div>
  `;
}

// ---------- Share Modal ----------
let shareProductId = null;

// ລິ້ງແບບ deep-link: ໜ້າຮ້ານດຽວກັນ + ?id=xxxxx ຈະເປີດ modal ສິນຄ້ານັ້ນອັດຕະໂນມັດເມື່ອໂຫຼດໜ້າ
function productShareUrl(id) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('id', id);
  return url.toString();
}

function openShareModal(id) {
  shareProductId = id;
  document.getElementById('shareCopiedMsg').classList.add('hidden');
  document.getElementById('shareModal').classList.remove('hidden');
}
function closeShareModal() {
  document.getElementById('shareModal').classList.add('hidden');
}

async function shareViaCopyLink() {
  if (!shareProductId) return;
  const url = productShareUrl(shareProductId);
  try {
    await navigator.clipboard.writeText(url);
  } catch (err) {
    // Fallback ສຳລັບ browser ເກົ່າ ຫຼື ກໍລະນີ clipboard API ບໍ່ອະນຸຍາດ
    const tmp = document.createElement('textarea');
    tmp.value = url;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    document.body.removeChild(tmp);
  }
  const msg = document.getElementById('shareCopiedMsg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2500);
}

function shareViaWhatsApp() {
  if (!shareProductId) return;
  const p = allProducts.find(x => x.id.toString() === shareProductId.toString());
  const url = productShareUrl(shareProductId);
  const text = encodeURIComponent(`ສົນໃຈສິນຄ້າ: ${p ? p.title : ''}\n${url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareViaMessenger() {
  if (!shareProductId) return;
  const url = productShareUrl(shareProductId);
  // ໜ້າຕ້ອງ deploy ຢູ່ domain ຈິງ (https) ແລະ ຕັ້ງ Facebook App ID ຈິງ ຈຶ່ງຈະໃຊ້ Send Dialog ໄດ້ເຕັມຮູບແບບ
  const appId = CONFIG.FACEBOOK_APP_ID || '';
  if (appId) {
    const dialogUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=${appId}&redirect_uri=${encodeURIComponent(url)}`;
    window.open(dialogUrl, '_blank', 'width=600,height=500');
  } else {
    // ບໍ່ມີ App ID ຕັ້ງໄວ້ -> ໃຊ້ URL scheme ຂອງ Messenger ໂດຍກົງ (ໃຊ້ໄດ້ດີເທິງມືຖື)
    window.open(`fb-messenger://share/?link=${encodeURIComponent(url)}`, '_blank');
  }
}

// ---------- Deep link: ຖ້າມີ ?id=xxxxx ໃນ URL ໃຫ້ເປີດ modal ສິນຄ້ານັ້ນອັດຕະໂນມັດ ----------
function openDeepLinkedProductIfAny() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id && allProducts.find(x => x.id.toString() === id.toString())) {
    openProductModal(id);
  }
}
