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
  showLoadingOverlay('ກຳລັງໂຫຼດສິນຄ້າ...');
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
    hideLoadingOverlay();
  } catch (err) {
    console.error('Error loading data:', err);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.innerText = 'ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນ (ກວດ config.js ວ່າຕັ້ງ GITHUB_OWNER/REPO ຖືກຕ້ອງບໍ່)';
    hideLoadingOverlay();
    showToast('ໂຫຼດຂໍ້ມູນສິນຄ້າບໍ່ສຳເລັດ, ກະລຸນາລອງໃໝ່', 'error');
  }
}

function toggleCurrency() {
  currentCurrency = currentCurrency === 'LAK' ? 'THB' : 'LAK';
  const btn = document.getElementById('currencyBtn');
  btn.innerText = currentCurrency === 'LAK' ? '₭ LAK' : '฿ THB';
  btn.classList.remove('price-pulse');
  void btn.offsetWidth; // ຣີສະຕາດ animation
  btn.classList.add('price-pulse');
  fadeSwapGrid(applyFilters);
}

function toggleLang() {
  currentLang = currentLang === 'LO' ? 'EN' : 'LO';
  document.getElementById('langBtn').innerText = currentLang === 'LO' ? 'EN' : 'ລາວ';
  updateUIText();
  fadeSwapGrid(applyFilters);
}

// ຄ່ອຍໆ fade grid ອອກ/ເຂົ້າ ເວລາປ່ຽນ ສະກຸນເງິນ/ພາສາ/ໝວດໝູ່ ໃຫ້ຮູ້ສຶກລື່ນໄຫຼ ບໍ່ໂດດ
function fadeSwapGrid(updateFn) {
  const grid = document.getElementById('productGrid');
  grid.classList.add('fade-swap', 'fading');
  setTimeout(() => {
    updateFn();
    grid.classList.remove('fading');
  }, 150);
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
  const activeClasses = ['bg-slate-900', 'text-white', 'shadow-md'];
  const inactiveClasses = ['bg-white', 'text-slate-600', 'hover:bg-slate-100', 'border', 'border-slate-100', 'shadow-sm'];

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove(...activeClasses);
    btn.classList.add(...inactiveClasses);
  });
  if (btnEl) {
    btnEl.classList.remove(...inactiveClasses);
    btnEl.classList.add(...activeClasses);
  }

  // ຣີເຊັດຄ່າ dropdown ທັງໝົດ
  ['filterRam', 'filterSsd', 'filterYear', 'filterAccType', 'filterAccWatt', 'filterDjSize', 'filterSwType']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // ສະແດງສະເພາະ dropdown ຂອງໝວດທີ່ເລືອກ
  document.getElementById('macFilterSection').style.display = (cat === 'Macbook') ? 'grid' : 'none';
  document.getElementById('accFilterSection').style.display = (cat === 'Accessories') ? 'grid' : 'none';
  document.getElementById('djFilterSection').style.display = (cat === 'DJ') ? 'grid' : 'none';
  document.getElementById('swFilterSection').style.display = (cat === 'Software') ? 'grid' : 'none';

  fadeSwapGrid(applyFilters);
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

// ຂໍ້ຄວາມ "ຂອງແຖມ" ສະແດງສະເພາະສິນຄ້າໝວດ Macbook ຢູ່ໜ້າ Modal ລາຍລະອຽດສິນຄ້າ
const MACBOOK_FREEBIE_TEXT = 'ສາຍສາກ ສະຕິກເກີ້ພາສາລາວ ລົງໂປຣແກຣມດີເຈຂອງແທ້ Rekordbox Serato Pro ໂປຣແກຣມເຮັດເພງແທ້ ແຖມເພງດີເຈເຕັມເຄື່ອງ';

// ຄີບອດ → ແປງລະຫັດ (TH/EN ฯลฯ) ໃຫ້ເປັນຂໍ້ຄວາມທີ່ອ່ານເຂົ້າໃຈງ່າຍ
// ໃຊ້ໄດ້ທັງ index.html (app.js) ແລະ agent.html (agent.js) — ຄັດລອກຟັງຊັນນີ້ໄປໃສ່ agent.js ນຳ
// ຖ້າຢາກປັບ mapping ໃໝ່, ແກ້ບ່ອນດຽວນີ້ (ແລ້ວແກ້ agent.js ໃຫ້ຄືກັນ)
function formatKeyboard(kb) {
  const map = {
    'TH': 'ຄີບອດໄທ',
    'EN': 'ຄີບອດອັງກິດ',
    'US': 'ຄີບອດອັງກິດ',
    'LA': 'ຄີບອດລາວ'
  };
  return map[(kb || '').toUpperCase()] || kb || '';
}

// ຊື່ສີ (ພາສາອັງກິດ) → ແປເປັນພາສາລາວ ສຳລັບສີທີ່ຮູ້ຈັກ, ຖ້າບໍ່ຮູ້ຈັກໃຫ້ສະແດງຄືເດີມ
function colorLabelLao(color) {
  const map = {
    'Space Gray': 'ສີເທົາ',
    'Silver': 'ສີເງິນ',
    'Rose Gold': 'ສີຄຳກຸຫຼາບທອງ',
    'Midnight': 'ສີດຳກາງຄືນ',
    'Starlight': 'ສີແສງດາວ'
  };
  return map[color] || color || '';
}

// ---------- ສະຕັອກ (ຄິດໄລ່ຈາກ units, ຫຼື colorStock/status ເກົ່າຖ້າຍັງບໍ່ໄດ້ migrate) ----------

// ຈຳນວນຄົງເຫຼືອທັງໝົດ = Ready units (ໃຊ້ເປັນຕົວຕັດສິນໃຈໃນໜ້າຮ້ານ)
// ຖ້າໃຊ້ units → ນັບ Ready; ຖ້າໃຊ້ colorStock ເກົ່າ → sum qty; ຖ້າ 1 ID = 1 ເຄື່ອງ → null (ໃຊ້ p.status)
function totalColorStock(p) {
  if (Array.isArray(p.units) && p.units.length > 0) {
    return p.units.filter(u => u.status === 'Ready').length;
  }
  if (p.colorStock && typeof p.colorStock === 'object' && Object.keys(p.colorStock).length > 0) {
    return Object.values(p.colorStock).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  }
  return null; // single-item product → ໃຊ້ p.status ແທນ
}

// ຄ່ານີ້ໃຊ້ສະເພາະສຳລັບ badge ແລະ modal per-color breakdown (ບໍ່ໃຊ້ຕັດສິນໃຈ in-stock/out-of-stock)
function stockByColorFromUnits(p) {
  if (!Array.isArray(p.units) || p.units.length === 0) return null;
  const result = {};
  p.units.forEach(u => {
    const color = u.color || 'ບໍ່ລະບຸສີ';
    if (!(color in result)) result[color] = 0;
    if (u.status === 'Ready') result[color]++;
  });
  return result;
}

function getEffectiveColorStock(p) {
  return stockByColorFromUnits(p) || p.colorStock || null;
}

function hasColorStock(p) {
  const stock = getEffectiveColorStock(p);
  return !!stock && Object.keys(stock).length > 0;
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
    const stockTotal = totalColorStock(p);
    let isSold = stockTotal !== null ? stockTotal <= 0 : p.status === 'Sold';
    let priceVal = priceInCurrentCurrency(p.priceLAK, p.priceTHB);
    let priceFormatted = Number(priceVal).toLocaleString();
    let oldPriceVal = priceInCurrentCurrency(p.oldPriceLAK, p.oldPriceTHB);
    let currencySymbol = currentCurrency === 'THB' ? '฿' : '₭';

    let statusText, statusColor;
    if (stockTotal !== null) {
      statusText = stockTotal > 0 ? (currentLang === 'EN' ? `${stockTotal} in stock` : `ຍັງເຫຼືອ ${stockTotal} ເຄື່ອງ`) : (currentLang === 'EN' ? 'Sold Out' : 'ໝົດສະຕັອກ');
      statusColor = stockTotal > 0 ? 'liquid-pill pill-ready' : 'liquid-pill pill-out';
    } else {
      statusText = p.status === 'Ready' ? (currentLang === 'EN' ? 'Ready' : 'ພ້ອມຂາຍ') : (p.status === 'Reserved' ? (currentLang === 'EN' ? 'Reserved' : 'ຈອງແລ້ວ') : (currentLang === 'EN' ? 'Sold' : 'ຂາຍແລ້ວ'));
      statusColor = p.status === 'Ready' ? 'liquid-pill pill-ready' : (p.status === 'Reserved' ? 'liquid-pill pill-low' : 'liquid-pill pill-out');
    }
    let mainImg = (p.images && p.images.length > 0 && p.images[0]) ? p.images[0] : 'https://placehold.co/400x300?text=No+Image';
    const delay = Math.min(idx, 11) * 45;

    return `
      <div class="product-card group glass-card rounded-3xl-custom overflow-hidden flex flex-col justify-between cursor-pointer" style="animation-delay:${delay}ms" onclick="openProductModal('${p.id}')">
        <div>
          <div class="relative aspect-square bg-slate-100 overflow-hidden">
            <img src="${mainImg}" alt="${p.title}" class="card-img w-full h-full object-cover">
            <span class="absolute top-3 left-3 liquid-pill ${statusColor}">${statusText}</span>
          </div>
          <div class="p-3 pb-1">
            <div class="flex items-center gap-1.5">
              <h3 class="font-bold text-slate-800 text-sm line-clamp-2">${p.title}</h3>
              ${hasColorStock(p)
                ? `<span class="shrink-0 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap"><i class="fas fa-palette"></i> ${Object.keys(getEffectiveColorStock(p)).length} ສີ</span>`
                : (p.color ? `<span class="shrink-0 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">${colorLabelLao(p.color)}</span>` : '')}
            </div>
            ${p.category === 'Macbook' ? `
              <p class="text-[10px] text-slate-400 font-medium mt-1 leading-snug">${p.cpu ? p.cpu + ' · ' : ''}RAM ${p.ram || '-'}GB · SSD ${p.ssd || '-'}GB${p.screenSize ? ' · ' + p.screenSize : ''}</p>
              <span class="inline-block mt-1 liquid-pill pill-indigo">${formatKeyboard(p.keyboard || 'TH')}</span>
            ` : (p.keyboard ? `<span class="inline-block mt-1 liquid-pill pill-indigo">${formatKeyboard(p.keyboard)}</span>` : '')}
          </div>
        </div>
        <div class="px-3 py-2.5 border-t border-white/30 flex items-center justify-between">
          <div class="min-w-0 overflow-hidden">
            <span class="text-[9px] text-slate-400 block">${currentCurrency === 'THB' ? 'ລາຄາ (บาท)' : 'ລາຄາ (ກີບ)'}</span>
            ${isSold ? `<span class="text-slate-400 font-bold text-xs italic">${stockTotal !== null ? 'ໝົດສະຕັອກ' : 'ຂາຍແລ້ວ'}</span>` : `
              <p class="text-rose-600 font-bold text-[0.82rem] leading-tight whitespace-nowrap">${priceFormatted} ${currencySymbol}</p>
            `}
          </div>
          <div class="shrink-0 w-7 h-7 rounded-full bg-slate-50/80 text-slate-400 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
            <i class="fas fa-arrow-right text-[10px]"></i>
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

  const stockTotal = totalColorStock(p);
  const statusText = stockTotal !== null
    ? (stockTotal > 0 ? (currentLang === 'EN' ? `${stockTotal} in stock` : `ຍັງເຫຼືອ ${stockTotal} ເຄື່ອງ`) : (currentLang === 'EN' ? 'Sold Out' : 'ໝົດສະຕັອກ'))
    : (p.status === 'Ready' ? (currentLang === 'EN' ? 'Ready' : 'ພ້ອມຂາຍ') : (p.status === 'Reserved' ? (currentLang === 'EN' ? 'Reserved' : 'ຈອງແລ້ວ') : (currentLang === 'EN' ? 'Sold' : 'ຂາຍແລ້ວ')));
  const statusColor = stockTotal !== null
    ? (stockTotal > 0 ? 'liquid-pill pill-ready' : 'liquid-pill pill-out')
    : (p.status === 'Ready' ? 'liquid-pill pill-ready' : (p.status === 'Reserved' ? 'liquid-pill pill-low' : 'liquid-pill pill-out'));

  let modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <div class="space-y-4">
      <div class="relative h-64 bg-slate-100 rounded-2xl overflow-hidden">
        <img id="sliderImg" src="${activeImages[0]}" class="w-full h-full object-cover cursor-zoom-in" onclick="openImageZoom(currentSlideIdx)">
        <span class="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-slate-900/60 text-white flex items-center justify-center text-xs pointer-events-none"><i class="fas fa-magnifying-glass-plus"></i></span>
        <span class="absolute top-3 left-3 liquid-pill ${statusColor}">${statusText}</span>
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
          ${p.category === 'Macbook' ? `<span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-wider">${formatKeyboard(p.keyboard || 'TH')}</span>` : ''}
          ${p.color ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">${colorLabelLao(p.color)}</span>` : ''}
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

      ${p.category === 'Macbook' ? `
      <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 mb-1.5"><i class="fas fa-gift"></i> ຂອງແຖມ</span>
        <p class="text-xs text-slate-600 leading-relaxed">${MACBOOK_FREEBIE_TEXT}</p>
      </div>
      ` : ''}

      ${hasColorStock(p) ? `
      <div class="bg-slate-50 rounded-2xl p-4">
        <span class="text-[10px] text-slate-400 flex items-center gap-1.5 mb-2"><i class="fas fa-palette"></i> ສະຕັອກແຍກຕາມສີ</span>
        <div class="space-y-1.5">
          ${Object.entries(getEffectiveColorStock(p)).map(([color, qty]) => `
            <div class="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2">
              <span class="font-medium text-slate-600">${colorLabelLao(color)}</span>
              ${Number(qty) > 0
                ? `<span class="text-emerald-600 font-semibold">ຍັງເຫຼືອ ${qty} ເຄື່ອງ</span>`
                : `<span class="text-rose-400 font-semibold">ສິນຄ້າໝົດ</span>`}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-4">
        <span class="text-[10px] text-slate-400 block">ລາຄາສິນຄ້າ</span>
        ${(stockTotal !== null ? stockTotal <= 0 : p.status === 'Sold') ? `<span class="text-slate-400 font-bold text-sm italic">${stockTotal !== null ? 'ໝົດສະຕັອກ' : 'ສິນຄ້ານີ້ຂາຍແລ້ວ'}</span>` : `
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-rose-600 font-extrabold text-2xl">${priceFormatted} ${currencySymbol}</span>
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

// ---------- Warranty Check (ຄົ້ນຫາດ້ວຍ Serial Number ຂອງ unit ໂດຍກົງ) ----------
function openWarrantyModal() { document.getElementById('warrantyModal').classList.remove('hidden'); }
function closeWarrantyModal() { document.getElementById('warrantyModal').classList.add('hidden'); }

// ຄິດໄລ່ຂໍ້ຄວາມສະຖານະປະກັນ ຈາກ unit ດຽວ (ໃຊ້ unit.warrantyEndDate ທີ່ຄິດໄລ່ໄວ້ຢູ່ແລ້ວຕອນຂາຍ)
function unitWarrantyText(unit) {
  if (unit.status !== 'Sold') return 'ຍັງບໍ່ໄດ້ຂາຍ (ຍັງບໍ່ເລີ່ມນັບປະກັນ)';
  if (!unit.hasWarranty || !unit.warrantyEndDate) return 'ບໍ່ມີປະກັນ';

  const expiryDate = new Date(unit.warrantyEndDate);
  const expiryText = expiryDate.toLocaleDateString('en-GB'); // dd/mm/yyyy
  const isActive = expiryDate.getTime() >= new Date().getTime();
  return expiryText + (isActive ? ' (ຍັງຢູ່ໃນໄລຍະປະກັນ)' : ' (ໝົດອາຍຸປະກັນແລ້ວ)');
}

function checkWarranty() {
  const sn = document.getElementById('warrantyInputSn').value.trim();
  const box = document.getElementById('warrantyResultBox');
  if (!sn) { showToast('ກະລຸນາໃສ່ Serial Number', 'info'); return; }

  // ຄົ້ນຫາ unit ທີ່ SN ກົງກັນ ຈາກທຸກສິນຄ້າ
  let foundUnit = null, foundProduct = null;
  for (const p of allProducts) {
    if (!Array.isArray(p.units)) continue;
    const u = p.units.find(x => (x.sn || '').trim().toLowerCase() === sn.toLowerCase());
    if (u) { foundUnit = u; foundProduct = p; break; }
  }

  if (!foundUnit) {
    box.innerHTML = `<p class="text-xs text-rose-500 mt-2">ບໍ່ພົບ Serial Number ນີ້ໃນລະບົບ</p>`;
    return;
  }

  const warrantyText = unitWarrantyText(foundUnit);
  const saleTypeText = foundUnit.status !== 'Sold' ? '-' : (foundUnit.saleType === 'retail' ? 'ຂາຍແບບມີປະກັນ (ລູກຄ້າທົ່ວໄປ)' : 'ຂາຍໃຫ້ຕົວແທນ (ບໍ່ມີປະກັນ)');

  box.innerHTML = `
    <div class="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 text-xs space-y-1.5 mt-2">
      <p><b>ລຸ້ນ:</b> ${foundProduct.title}</p>
      <p><b>ສີ:</b> ${foundUnit.color ? colorLabelLao(foundUnit.color) : '-'}</p>
      <p><b>RAM / SSD:</b> ${foundProduct.ram || '-'} GB / ${foundProduct.ssd || '-'} GB</p>
      <p><b>ຂະໜາດໜ້າຈໍ:</b> ${foundProduct.screenSize || '-'}</p>
      <p><b>ປີຜະລິດ:</b> ${foundProduct.year || '-'}</p>
      <p><b>ຮອບຊາດ (Cycle Count):</b> ${foundUnit.cycleCount || 'ບໍ່ມີຂໍ້ມູນ'}</p>
      <p><b>ວັນທີ່ຂາຍ:</b> ${foundUnit.soldDate || 'ຍັງບໍ່ໄດ້ຂາຍ'}</p>
      ${foundUnit.salePrice ? `<p><b>ລາຄາທີ່ຂາຍຈິງ:</b> <span class="text-rose-600 font-bold">${Number(foundUnit.salePrice).toLocaleString()} ₭</span></p>` : ''}
      <p><b>ປະເພດການຂາຍ:</b> ${saleTypeText}</p>
      <p><b>ສະຖານະປະກັນ:</b> <span class="text-indigo-600 font-semibold">${warrantyText}</span></p>
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
  closeShareModal();
  showToast('ຄັດລອກລິ້ງແລ້ວ!', 'success');
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

/* =========================================================================
   Full-screen Image Zoom Viewer — ຄລິກຮູບຫຼັກ (sliderImg) ຢູ່ modal ລາຍລະອຽດສິນຄ້າ
   ຮອງຮັບ: Pinch-to-zoom (2 ນິ້ວ), Mouse wheel zoom, Drag/Pan, Double-click/tap zoom
   ========================================================================= */

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.6;

let zoomScale = 1;
let zoomPanX = 0;
let zoomPanY = 0;

let zoomActivePointers = new Map(); // pointerId -> {x, y}
let zoomPinchStartDist = 0;
let zoomPinchStartScale = 1;
let zoomPinchStartMidpoint = { x: 0, y: 0 };
let zoomPanStart = null;   // {x, y, panX, panY} — ຈຸດເລີ່ມຕົ້ນຕອນລາກ (1 ນິ້ວ/mouse)
let zoomIsDragging = false;
let zoomLastTapTime = 0;
let zoomJustSwiped = false;

let zoomImages = [];   // ລາຍການຮູບທັງໝົດຂອງສິນຄ້າທີ່ກຳລັງເບິ່ງຢູ່ (ຄັດລອກມາຈາກ activeImages ຕອນເປີດ)
let zoomIndex = 0;

function openImageZoom(index) {
  zoomImages = activeImages.slice();
  if (zoomImages.length === 0) return;
  zoomIndex = Math.max(0, Math.min(index || 0, zoomImages.length - 1));

  const viewer = document.getElementById('imageZoomViewer');
  renderZoomImage();
  resetZoomState();
  viewer.classList.remove('hidden');
  viewer.classList.add('show');
  document.body.style.overflow = 'hidden'; // ບໍ່ໃຫ້ scroll ພື້ນຫຼັງໄປພ້ອມກັນ
}

function closeImageZoom() {
  const viewer = document.getElementById('imageZoomViewer');
  viewer.classList.add('hidden');
  viewer.classList.remove('show');
  document.body.style.overflow = '';
  resetZoomState();
}

// ສະແດງຮູບໃນ index ປັດຈຸບັນ + ອັບເດດ counter ແລະ ເຊື່ອງ/ໂຊປຸ່ມ prev/next ຖ້າມີຮູບດຽວ
function renderZoomImage() {
  const img = document.getElementById('zoomImg');
  img.src = zoomImages[zoomIndex];

  const counter = document.getElementById('zoomCounter');
  const prevBtn = document.getElementById('zoomPrevBtn');
  const nextBtn = document.getElementById('zoomNextBtn');
  const multi = zoomImages.length > 1;

  counter.classList.toggle('hidden', !multi);
  if (multi) counter.innerText = `${zoomIndex + 1} / ${zoomImages.length}`;
  prevBtn.style.display = multi ? 'flex' : 'none';
  nextBtn.style.display = multi ? 'flex' : 'none';
}

// ປ່ຽນຮູບ (ຈາກປຸ່ມ prev/next, ລູກສອນຄີບອດ, ຫຼື swipe) — direction: -1 = ຮູບກ່ອນ, 1 = ຮູບຕໍ່ໄປ
function zoomShowStep(direction) {
  if (zoomImages.length <= 1) return;
  zoomIndex = (zoomIndex + direction + zoomImages.length) % zoomImages.length;
  document.getElementById('zoomImg').classList.remove('no-transition');
  renderZoomImage();
  resetZoomState();

  // sync ກັບ slider ຂອງ modal ຫຼັກ (ຖ້າຮູບຊຸດດຽວກັນ)
  if (zoomImages.length === activeImages.length) {
    currentSlideIdx = zoomIndex;
    if (typeof setSlide === 'function') setSlide(currentSlideIdx);
  }
}

function resetZoomState() {
  zoomScale = 1;
  zoomPanX = 0;
  zoomPanY = 0;
  zoomActivePointers.clear();
  zoomPanStart = null;
  zoomIsDragging = false;
  applyZoomTransform();
  document.getElementById('zoomViewerStage').classList.remove('zoomed', 'dragging');
}

function zoomReset() {
  const img = document.getElementById('zoomImg');
  img.classList.remove('no-transition');
  resetZoomState();
}

function zoomStep(direction) {
  const img = document.getElementById('zoomImg');
  img.classList.remove('no-transition');
  setZoomScale(zoomScale + direction * ZOOM_STEP, null);
}

// ຕັ້ງຄ່າ scale ໃໝ່, ຄົງຈຸດ focal (focalPoint) ໃຫ້ຢູ່ບ່ອນເດີມໃນຈໍ (ຊູມເຂົ້າຫາຈຸດທີ່ scroll/pinch)
function setZoomScale(newScale, focalPoint) {
  newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newScale));
  const stage = document.getElementById('zoomViewerStage');
  const rect = stage.getBoundingClientRect();
  const fx = focalPoint ? focalPoint.x - rect.left : rect.width / 2;
  const fy = focalPoint ? focalPoint.y - rect.top : rect.height / 2;

  // ຄິດໄລ່ຈຸດເທິງຮູບ (ກ່ອນ scale ປ່ຽນ) ທີ່ຢູ່ໃຕ້ focal point
  const imgX = (fx - zoomPanX) / zoomScale;
  const imgY = (fy - zoomPanY) / zoomScale;

  zoomScale = newScale;
  zoomPanX = fx - imgX * zoomScale;
  zoomPanY = fy - imgY * zoomScale;

  if (zoomScale <= 1.001) { zoomScale = 1; zoomPanX = 0; zoomPanY = 0; }
  clampZoomPan();
  applyZoomTransform();

  stage.classList.toggle('zoomed', zoomScale > 1);
}

function clampZoomPan() {
  const stage = document.getElementById('zoomViewerStage');
  const img = document.getElementById('zoomImg');
  if (!img.naturalWidth) return;
  const rect = stage.getBoundingClientRect();

  // ຂະໜາດຮູບຕອນສະແດງຜົນຢູ່ scale=1 (object-fit: contain style manual calc)
  const baseW = img.clientWidth || rect.width;
  const baseH = img.clientHeight || rect.height;
  const scaledW = baseW * zoomScale;
  const scaledH = baseH * zoomScale;

  const minX = Math.min(0, rect.width - scaledW);
  const minY = Math.min(0, rect.height - scaledH);
  zoomPanX = Math.max(minX, Math.min(0, zoomPanX));
  zoomPanY = Math.max(minY, Math.min(0, zoomPanY));
}

function applyZoomTransform() {
  const img = document.getElementById('zoomImg');
  img.style.transform = `translate(${zoomPanX}px, ${zoomPanY}px) scale(${zoomScale})`;
}

function zoomPointerDistance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}
function zoomPointerMidpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

(function initImageZoomHandlers() {
  document.addEventListener('DOMContentLoaded', bindZoomEvents);
  if (document.readyState !== 'loading') bindZoomEvents();

  function bindZoomEvents() {
    const stage = document.getElementById('zoomViewerStage');
    const img = document.getElementById('zoomImg');
    if (!stage || stage.dataset.zoomBound) return;
    stage.dataset.zoomBound = '1';

    // ---- Pointer events: ຮອງຮັບທັງ mouse ແລະ touch ໃນ handler ດຽວ ----
    stage.addEventListener('pointerdown', e => {
      stage.setPointerCapture(e.pointerId);
      zoomActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (zoomActivePointers.size === 2) {
        const pts = Array.from(zoomActivePointers.values());
        zoomPinchStartDist = zoomPointerDistance(pts[0], pts[1]);
        zoomPinchStartScale = zoomScale;
        zoomPinchStartMidpoint = zoomPointerMidpoint(pts[0], pts[1]);
        zoomPanStart = null;
      } else if (zoomActivePointers.size === 1) {
        // double-click / double-tap → toggle zoom
        const now = Date.now();
        if (now - zoomLastTapTime < 300) {
          img.classList.remove('no-transition');
          if (zoomScale > 1) {
            zoomReset();
          } else {
            setZoomScale(2.4, { x: e.clientX, y: e.clientY });
          }
          zoomLastTapTime = 0;
          return;
        }
        zoomLastTapTime = now;

        zoomPanStart = { x: e.clientX, y: e.clientY, panX: zoomPanX, panY: zoomPanY };
      }
    });

    stage.addEventListener('pointermove', e => {
      if (!zoomActivePointers.has(e.pointerId)) return;
      zoomActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (zoomActivePointers.size === 2) {
        // ---- Pinch to zoom ----
        img.classList.add('no-transition');
        const pts = Array.from(zoomActivePointers.values());
        const dist = zoomPointerDistance(pts[0], pts[1]);
        if (zoomPinchStartDist > 0) {
          const scale = zoomPinchStartScale * (dist / zoomPinchStartDist);
          setZoomScale(scale, zoomPinchStartMidpoint);
        }
      } else if (zoomActivePointers.size === 1 && zoomPanStart && zoomScale > 1) {
        // ---- Pan (ລາກ) ---- ໃຊ້ໄດ້ສະເພາະຕອນຊູມຢູ່ ----
        img.classList.add('no-transition');
        zoomIsDragging = true;
        stage.classList.add('dragging');
        zoomPanX = zoomPanStart.panX + (e.clientX - zoomPanStart.x);
        zoomPanY = zoomPanStart.panY + (e.clientY - zoomPanStart.y);
        clampZoomPan();
        applyZoomTransform();
      }
    });

    function endPointer(e) {
      const wasSinglePointer = zoomActivePointers.size === 1;
      const startInfo = zoomPanStart;

      zoomActivePointers.delete(e.pointerId);
      if (zoomActivePointers.size < 2) zoomPinchStartDist = 0;

      // ---- Swipe ປ່ຽນຮູບ: ໃຊ້ໄດ້ສະເພາະຕອນບໍ່ໄດ້ຊູມ (scale=1) ແລະ ເປັນການລາກນິ້ວດຽວ ----
      if (wasSinglePointer && zoomScale <= 1 && startInfo) {
        const dx = e.clientX - startInfo.x;
        const dy = e.clientY - startInfo.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          zoomJustSwiped = true;
          zoomShowStep(dx < 0 ? 1 : -1);
        }
      }

      if (zoomActivePointers.size === 0) {
        zoomPanStart = null;
        zoomIsDragging = false;
        stage.classList.remove('dragging');
        img.classList.remove('no-transition');
      }
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse' && zoomActivePointers.size <= 1) endPointer(e);
    });

    // ---- Mouse wheel zoom (desktop) ----
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      img.classList.remove('no-transition');
      const delta = e.deltaY < 0 ? ZOOM_STEP * 0.5 : -ZOOM_STEP * 0.5;
      setZoomScale(zoomScale + delta, { x: e.clientX, y: e.clientY });
    }, { passive: false });

    // ---- ກົດພື້ນຫຼັງດຳ (ນອກຮູບ) ເພື່ອປິດ, ແຕ່ບໍ່ປິດຖ້າ user ຫາກໍ່ລາກ/ຊູມ/swipe ----
    stage.addEventListener('click', e => {
      if (zoomJustSwiped) { zoomJustSwiped = false; return; }
      if (e.target === stage && !zoomIsDragging && zoomScale <= 1) {
        closeImageZoom();
      }
    });
  }
})();

// ---- ຄີບອດ: Esc ປິດ, ← → ປ່ຽນຮູບ ----
document.addEventListener('keydown', e => {
  const viewer = document.getElementById('imageZoomViewer');
  if (!viewer || !viewer.classList.contains('show')) return;

  if (e.key === 'Escape') {
    closeImageZoom();
  } else if (e.key === 'ArrowLeft') {
    zoomShowStep(-1);
  } else if (e.key === 'ArrowRight') {
    zoomShowStep(1);
  }
});
