/* =========================================================================
   admin.js — ໜ້າຫຼັງບ້ານ (admin.html)
   ອ່ານ/ຂຽນ data/products.json ແລະ data/settings.json ໂດຍກົງຜ່ານ GitHub Contents API
   ໂດຍໃຊ້ Personal Access Token (PAT) ຂອງແອດມິນ (ບໍ່ໄດ້ຖືກເກັບໄວ້ຢູ່ໃສນອກຈາກ browser ຂອງທ່ານ)
   ========================================================================= */

let allProducts = [];
let githubToken = '';
let currentEditId = null;

const _repoLabel = document.getElementById('repoLabel');
if (_repoLabel) _repoLabel.innerText = `${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}`;

/* ---------------------------- GitHub API helpers ---------------------------- */

function ghHeaders() {
  return {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

// UTF-8 safe base64 encode/decode (ຮອງຮັບໂຕໜັງສືລາວ)
function b64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUnicode(str) {
  return decodeURIComponent(escape(atob(str)));
}

// ດຶງໄຟລ໌ + sha ປັດຈຸບັນ (ຕ້ອງໃຊ້ sha ເວລາຈະຂຽນທັບໄຟລ໌ເກົ່າ)
async function ghGetFile(path) {
  const res = await fetch(ghApiContentsUrl(path) + `?ref=${CONFIG.GITHUB_BRANCH}&_=${Date.now()}`, {
    headers: ghHeaders()
  });
  if (res.status === 404) return { exists: false, sha: null, json: null };
  if (!res.ok) throw new Error(`GitHub API error (${res.status}) ອ່ານ ${path} ບໍ່ໄດ້`);
  const data = await res.json();
  const text = b64DecodeUnicode(data.content.replace(/\n/g, ''));
  return { exists: true, sha: data.sha, json: JSON.parse(text) };
}

// ຂຽນ/ອັບເດດໄຟລ໌ JSON ລົງ repo (commit ໂດຍກົງ)
async function ghPutJson(path, obj, sha, message) {
  const body = {
    message,
    content: b64EncodeUnicode(JSON.stringify(obj, null, 2)),
    branch: CONFIG.GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(ghApiContentsUrl(path), {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Commit ${path} ບໍ່ສຳເລັດ (${res.status}): ${errBody.message || ''}`);
  }
  return res.json();
}

// ອັບໂຫຼດຮູບພາບ (binary) ຂຶ້ນ repo, ຄືນ URL ຜ່ານ jsDelivr CDN
async function ghPutImage(path, base64Content, message) {
  const res = await fetch(ghApiContentsUrl(path), {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: base64Content, branch: CONFIG.GITHUB_BRANCH })
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`ອັບໂຫຼດຮູບບໍ່ສຳເລັດ (${res.status}): ${errBody.message || ''}`);
  }
  return res.json();
}

/* --------------------------------- Login --------------------------------- */

async function doLogin() {
  const tokenInput = document.getElementById('loginToken').value.trim();
  if (!tokenInput) return;
  githubToken = tokenInput;
  const btn = document.getElementById('loginBtn');
  const originalBtnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader-ring-sm"></span> ກຳລັງກວດສອບ Token...';

  try {
    // ກວດວ່າ token ໃຊ້ໄດ້ ໂດຍລອງອ່ານໄຟລ໌ products.json
    await ghGetFile(CONFIG.PRODUCTS_PATH);

    if (document.getElementById('rememberToken').checked) {
      localStorage.setItem('macdj_admin_token', githubToken);
    } else {
      sessionStorage.setItem('macdj_admin_token', githubToken);
    }

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('loginError').classList.add('hidden');
    showToast('ເຂົ້າສູ່ລະບົບສຳເລັດແລ້ວ, ຍິນດີຕ້ອນຮັບ!', 'success');
    loadData();
  } catch (err) {
    console.error(err);
    document.getElementById('loginError').classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}
const _loginTokenInput = document.getElementById('loginToken');
if (_loginTokenInput) _loginTokenInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogout() {
  githubToken = '';
  localStorage.removeItem('macdj_admin_token');
  sessionStorage.removeItem('macdj_admin_token');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

// ຖ້າມີ token ຄ້າງໄວ້ຈາກຄັ້ງກ່ອນ (remember me) ໃຫ້ login ອັດຕະໂນມັດ
(function autoLogin() {
  const saved = localStorage.getItem('macdj_admin_token') || sessionStorage.getItem('macdj_admin_token');
  if (saved) {
    githubToken = saved;
    ghGetFile(CONFIG.PRODUCTS_PATH).then(() => {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadData();
    }).catch(() => { githubToken = ''; });
  }
})();

/* --------------------------------- Data load --------------------------------- */

async function loadData() {
  document.getElementById('adminLoading').style.display = 'grid';
  document.getElementById('adminGrid').innerHTML = '';
  try {
    const [productsFile, settingsFile] = await Promise.all([
      ghGetFile(CONFIG.PRODUCTS_PATH),
      ghGetFile(CONFIG.SETTINGS_PATH)
    ]);
    allProducts = productsFile.json || [];
    const settings = settingsFile.json || { exchangeRate: 600, thbToLakRate: 600 };

    document.getElementById('settingRateLakToThb').value = settings.exchangeRate || '';
    document.getElementById('settingRateThbToLak').value = settings.thbToLakRate || '';
    document.getElementById('adminLoading').style.display = 'none';
    renderAdminGrid();
  } catch (err) {
    console.error(err);
    document.getElementById('adminLoading').style.display = 'none';
    showToast('ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ: ' + err.message, 'error', 5000);
  }
}

/* --------------------------------- Settings --------------------------------- */

async function saveExchangeRate() {
  const lakToThb = Number(document.getElementById('settingRateLakToThb').value);
  const thbToLak = Number(document.getElementById('settingRateThbToLak').value);
  if (!lakToThb || lakToThb <= 0 || !thbToLak || thbToLak <= 0) {
    showToast('ກະລຸນາໃສ່ຕົວເລກອັດຕາແລກປ່ຽນທັງສອງຊ່ອງໃຫ້ຖືກຕ້ອງ', 'info');
    return;
  }
  showLoadingOverlay('ກຳລັງບັນທຶກອັດຕາແລກປ່ຽນ...');
  try {
    const current = await ghGetFile(CONFIG.SETTINGS_PATH);
    await ghPutJson(CONFIG.SETTINGS_PATH, { exchangeRate: lakToThb, thbToLakRate: thbToLak }, current.sha,
      'chore: update exchange rate via admin panel');
    hideLoadingOverlay();
    showToast('ອັບເດດອັດຕາແລກປ່ຽນສຳເລັດແລ້ວ!', 'success');
  } catch (err) {
    console.error(err);
    hideLoadingOverlay();
    showToast('ເກີດຂໍ້ຜິດພາດ: ' + err.message, 'error', 5000);
  }
}

/* --------------------------------- Products grid --------------------------------- */

/* --------------------------------- Display label helpers (ຄືກັນກັບ app.js) --------------------------------- */

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

function renderAdminGrid() {
  const grid = document.getElementById('adminGrid');
  const keyword = document.getElementById('adminSearch').value.toLowerCase().trim();

  let list = allProducts;
  if (keyword) {
    list = list.filter(p =>
      p.title.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword) ||
      p.id.toLowerCase().includes(keyword)
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400 text-xs">ບໍ່ພົບສິນຄ້າ</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const statusText = p.status === 'Ready' ? 'ພ້ອມຂາຍ' : (p.status === 'Reserved' ? 'ຈອງແລ້ວ' : 'ຂາຍແລ້ວ');
    const statusColor = p.status === 'Ready' ? 'pill-ready' : (p.status === 'Reserved' ? 'pill-low' : 'pill-out');
    const mainImg = (p.images && p.images.length > 0 && p.images[0]) ? p.images[0] : 'https://placehold.co/300x220?text=No+Image';

    return `
      <div class="admin-card bg-white rounded-3xl-custom border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div class="relative h-36 bg-slate-100">
          <img src="${mainImg}" class="w-full h-full object-cover">
          <span class="absolute top-2 left-2 liquid-pill ${statusColor}">${statusText}</span>
        </div>
        <div class="p-3 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">${p.category}${p.color ? ' · ' + colorLabelLao(p.color) : ''}</span>
            <h3 class="font-bold text-slate-800 text-xs mt-0.5 line-clamp-2">${p.title}</h3>
            <div class="flex items-center justify-between mt-1">
              <p class="text-rose-600 font-bold text-xs">${p.priceLAK > 0 ? Number(p.priceLAK).toLocaleString() + ' ₭' : (p.priceTHB > 0 ? Number(p.priceTHB).toLocaleString() + ' ฿' : '-')}</p>
              ${p.wholesalePriceLAK > 0 ? `<p class="text-amber-600 font-semibold text-[10px] flex items-center gap-0.5"><i class="fas fa-tags"></i> ${Number(p.wholesalePriceLAK).toLocaleString()} ₭</p>` : ''}
            </div>
            ${p.units && p.units.length > 0 ? (() => {
              const ready = p.units.filter(u => u.status === 'Ready').length;
              const sold = p.units.filter(u => u.status === 'Sold').length;
              const consign = p.units.filter(u => u.status === 'Consignment').length;
              return `<p class="text-[9px] text-indigo-500 font-semibold mt-0.5"><i class="fas fa-barcode"></i> ${p.units.length} SN · ພ້ອມຂາຍ ${ready} · ຂາຍແລ້ວ ${sold}${consign > 0 ? ' · ຝາກຂາຍ ' + consign : ''}</p>`;
            })() : ''}
            ${p.yearFrom && p.yearTo ? `<p class="text-[9px] text-slate-400 mt-0.5"><i class="fas fa-calendar-days"></i> ໃຊ້ໄດ້: ${p.yearFrom} - ${p.yearTo}</p>` : ''}
          </div>
          <div class="flex gap-2 mt-2">
            <button onclick="openEditModal('${p.id}')" title="ແກ້ໄຂ" class="btn-press flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-xl text-sm">✏️</button>
            <button onclick="removeProduct('${p.id}')" title="ລຶບ" class="btn-press flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl text-sm">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* --------------------------------- ສະແດງ/ເຊື່ອງ ຊ່ອງກອກຕາມໝວດໝູ່ --------------------------------- */

// ຮຽກທຸກຄັ້ງທີ່ປ່ຽນ dropdown ໝວດໝູ່ (onchange="toggleCategoryFields()") ແລະ ຕອນເປີດຟອມ
function toggleCategoryFields() {
  const category = document.getElementById('pCategory').value;
  const form = document.getElementById('productForm');
  form.classList.remove('category-macbook', 'category-nonmacbook', 'category-dj', 'category-software');
  if (category === 'Macbook') {
    form.classList.add('category-macbook');
  } else if (category === 'DJ') {
    form.classList.add('category-dj');
  } else if (category === 'Software') {
    form.classList.add('category-software');
  } else {
    form.classList.add('category-nonmacbook');
  }
}

// ຕື່ມຕົວເລືອກປີ (2008 - ປີປັດຈຸບັນ+1) ໃສ່ dropdown "ລຸ້ນປີທີ່ໃຊ້ໄດ້" — ຮຽກຄັ້ງດຽວຕອນ admin.js ໂຫຼດ
function populateYearRangeSelects() {
  const startSel = document.getElementById('pYearStart');
  const endSel = document.getElementById('pYearEnd');
  if (!startSel || !endSel) return;

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 1; y >= 2008; y--) years.push(y);

  const optionsHtml = '<option value="">-- ເລືອກປີ --</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');
  startSel.innerHTML = optionsHtml;
  endSel.innerHTML = optionsHtml;
}
populateYearRangeSelects();

/* --------------------------------- Price input helpers --------------------------------- */

function formatPriceInput(el) {
  const raw = el.value.replace(/[^\d]/g, '');
  el.value = raw ? Number(raw).toLocaleString('en-US') : '';
}
function parsePriceInput(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const raw = el.value.replace(/[^\d]/g, '');
  return raw ? Number(raw) : 0;
}

/* --------------------------------- Select + "Other" combo fields (Color, CPU) --------------------------------- */

// ສະແດງ/ເຊື່ອງ ຊ່ອງພິມເອງ ເມື່ອເລືອກ "ອື່ນໆ (ພິມເອງ)" ຈາກ dropdown
function toggleOtherInput(selectId, otherInputId) {
  const select = document.getElementById(selectId);
  const other = document.getElementById(otherInputId);
  if (select.value === '__other__') {
    other.classList.remove('hidden');
    other.focus();
  } else {
    other.classList.add('hidden');
    other.value = '';
  }
}

// ຕັ້ງຄ່າ select+other ຈາກຄ່າທີ່ບັນທຶກໄວ້ໃນ product (ຖ້າຄ່າບໍ່ຢູ່ໃນລາຍການ ໃຫ້ໄປໃສ່ຊ່ອງ "ອື່ນໆ")
function setSelectOrOtherValue(selectId, otherInputId, value) {
  const select = document.getElementById(selectId);
  const other = document.getElementById(otherInputId);
  const optionExists = Array.from(select.options).some(opt => opt.value === value);
  if (value && optionExists) {
    select.value = value;
    other.classList.add('hidden');
    other.value = '';
  } else if (value) {
    select.value = '__other__';
    other.classList.remove('hidden');
    other.value = value;
  } else {
    select.value = '';
    other.classList.add('hidden');
    other.value = '';
  }
}

// ດຶງຄ່າສຸດທ້າຍ (ຄ່າຈາກ dropdown ຫຼື ຈາກຊ່ອງພິມເອງຖ້າເລືອກ "ອື່ນໆ")
function getSelectOrOtherValue(selectId, otherInputId) {
  const select = document.getElementById(selectId);
  if (select.value === '__other__') {
    return document.getElementById(otherInputId).value.trim();
  }
  return select.value;
}

/* --------------------------------- Edit modal --------------------------------- */

function openEditModal(id) {
  const form = document.querySelector('#editModal form');
  form.reset();
  document.getElementById('imagePreviewList').innerHTML = '';
  document.getElementById('pImageList').value = '';

  if (id === null) {
    currentEditId = null;
    document.getElementById('editModalTitle').innerText = 'ເພີ່ມສິນຄ້າໃໝ່';
    document.getElementById('saveBtn').innerText = 'ບັນທຶກສິນຄ້າໃໝ່';
    document.getElementById('pId').value = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('pId').readOnly = false;
    setSelectOrOtherValue('pColorSelect', 'pColorOther', '');
    setSelectOrOtherValue('pCpuSelect', 'pCpuOther', '');
    setUnitsToForm(null);
    document.getElementById('pYearStart').value = '';
    document.getElementById('pYearEnd').value = '';
    document.getElementById('pDjSn').value = '';
    document.getElementById('pDjCondition').value = '';
    document.getElementById('pProgramYear').value = '';
  } else {
    const p = allProducts.find(x => x.id.toString() === id.toString());
    if (!p) return;
    currentEditId = p.id;
    document.getElementById('editModalTitle').innerText = 'ແກ້ໄຂສິນຄ້າ';
    document.getElementById('saveBtn').innerText = 'ອັບເດດຂໍ້ມູນສິນຄ້າ';
    document.getElementById('pId').value = p.id;
    document.getElementById('pId').readOnly = true;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pTitle').value = p.title;
    document.getElementById('pPriceLAK').value = p.priceLAK ? Number(p.priceLAK).toLocaleString('en-US') : '';
    document.getElementById('pWholesalePriceLAK').value = p.wholesalePriceLAK ? Number(p.wholesalePriceLAK).toLocaleString('en-US') : '';
    // pOldPriceLAK removed from form — skip silently
    // pWholesalePriceTHB removed from form — skip silently
    document.getElementById('pPriceTHB').value = p.priceTHB ? Number(p.priceTHB).toLocaleString('en-US') : '';
    // pOldPriceTHB removed from form — skip silently
    document.getElementById('pRam').value = p.ram || '';
    document.getElementById('pSsd').value = p.ssd || '';
    document.getElementById('pYear').value = p.year || '';
    document.getElementById('pYearStart').value = p.yearFrom || '';
    document.getElementById('pYearEnd').value = p.yearTo || '';
    document.getElementById('pDjSn').value = p.djSn || '';
    document.getElementById('pDjCondition').value = p.djCondition || '';
    document.getElementById('pProgramYear').value = p.programYear || '';
    document.getElementById('pKeyboard').value = p.keyboard || 'TH';
    setSelectOrOtherValue('pColorSelect', 'pColorOther', p.color || '');
    setSelectOrOtherValue('pCpuSelect', 'pCpuOther', p.cpu || '');
    document.getElementById('pBattery').value = p.battery || '';
    document.getElementById('pScreenSize').value = p.screenSize || '';
    document.getElementById('pStatus').value = p.status;
    document.getElementById('pImageList').value = p.images ? p.images.join(',') : '';
    setUnitsToForm(p.units);
    renderImagePreviews();
  }

  toggleCategoryFields();
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

function renderImagePreviews() {
  const list = document.getElementById('pImageList').value.split(',').filter(Boolean);
  document.getElementById('imagePreviewList').innerHTML = list.map((url, idx) => `
    <div class="relative">
      <img src="${url}" class="w-14 h-14 object-cover rounded-xl border border-slate-200">
      <button type="button" onclick="removeImageAt(${idx})" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">✕</button>
    </div>
  `).join('');
}

function removeImageAt(idx) {
  const list = document.getElementById('pImageList').value.split(',').filter(Boolean);
  list.splice(idx, 1);
  document.getElementById('pImageList').value = list.join(',');
  renderImagePreviews();
}

/* --------------------------------- Image upload --------------------------------- */

// ອ່ານໄຟລ໌ດຽວເປັນ base64 (ໃຊ້ Promise ເພື່ອໃຫ້ອັບໂຫຼດຫຼາຍຮູບແບບລຽງກັນໄດ້ງ່າຍ)
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = () => reject(new Error('ອ່ານໄຟລ໌ບໍ່ສຳເລັດ'));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(input) {
  const files = Array.from(input.files || []);
  if (files.length === 0) return;

  const oversized = files.filter(f => f.size > 2 * 1024 * 1024);
  if (oversized.length > 0) {
    showToast(`ມີ ${oversized.length} ຮູບໃຫຍ່ເກີນ 2MB — ຄວນຫຍໍ້ຂະໜາດຮູບກ່ອນອັບໂຫຼດ ເພື່ອຄວາມໄວຂອງເວັບໄຊ`, 'info', 5000);
  }

  // ${CONFIG.IMAGES_DIR} ມາຈາກ config.js ເຊັ່ນ 'images/' — ຕັດ '/' ທ້າຍອອກກ່ອນເພື່ອກັນ path ຊ້ຳ '//'
  const imagesDir = (CONFIG.IMAGES_DIR || CONFIG.IMAGES_PATH || 'images').replace(/\/+$/, '');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    showLoadingOverlay(files.length > 1
      ? `ກຳລັງອັບໂຫຼດຮູບ ${i + 1}/${files.length}...`
      : 'ກຳລັງອັບໂຫຼດຮູບພາບຂຶ້ນ GitHub...');

    try {
      const base64Data = await readFileAsBase64(file);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${imagesDir}/${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}.${ext}`;

      await ghPutImage(fileName, base64Data, `feat: upload product image ${fileName}`);

      const url = ghCdnUrl(fileName);
      let current = document.getElementById('pImageList').value;
      document.getElementById('pImageList').value = current ? current + ',' + url : url;
      renderImagePreviews();
      successCount++;
    } catch (err) {
      console.error(err);
      failCount++;
    }
  }

  hideLoadingOverlay();
  input.value = '';

  if (failCount === 0) {
    showToast(successCount > 1 ? `ອັບໂຫຼດຮູບພາບສຳເລັດ ${successCount} ຮູບ!` : 'ອັບໂຫຼດຮູບພາບສຳເລັດແລ້ວ!', 'success');
  } else if (successCount > 0) {
    showToast(`ອັບໂຫຼດສຳເລັດ ${successCount} ຮູບ, ລົ້ມເຫຼວ ${failCount} ຮູບ — ລອງໃໝ່ຮູບທີ່ເຫຼືອ`, 'info', 6000);
  } else {
    showToast('ອັບໂຫຼດຮູບບໍ່ສຳເລັດເລີຍ, ລອງໃໝ່ພາຍຫຼັງ', 'error', 6000);
  }
}

/* --------------------------------- Save / Delete product --------------------------------- */

async function handleFormSubmit(e) {
  e.preventDefault();

  const priceLAK = parsePriceInput('pPriceLAK');
  const priceTHB = parsePriceInput('pPriceTHB');
  if (priceLAK <= 0 && priceTHB <= 0) {
    alert('ກະລຸນາໃສ່ລາຄາຢ່າງໜ້ອຍ 1 ຢ່າງ (ກີບ ຫຼື ບາດ)');
    return;
  }

  const existing = currentEditId ? allProducts.find(x => x.id.toString() === currentEditId.toString()) : null;
  const newStatus = document.getElementById('pStatus').value;

  // ນັບ soldDate ອັດຕະໂນມັດ ເມື່ອປ່ຽນສະຖານະເປັນ "Sold" ຄັ້ງທຳອິດ
  let soldDate = existing ? (existing.soldDate || '') : '';
  if (newStatus === 'Sold' && !soldDate) soldDate = new Date().toISOString();
  if (newStatus !== 'Sold') soldDate = existing ? existing.soldDate || '' : '';

  const product = {
    id: document.getElementById('pId').value,
    title: document.getElementById('pTitle').value,
    category: document.getElementById('pCategory').value,
    priceLAK: priceLAK,
    wholesalePriceLAK: parsePriceInput('pWholesalePriceLAK'),
    priceTHB: priceTHB,
    ram: document.getElementById('pRam').value,
    ssd: document.getElementById('pSsd').value,
    year: document.getElementById('pYear').value,
    yearFrom: document.getElementById('pYearStart').value,
    yearTo: document.getElementById('pYearEnd').value,
    djSn: document.getElementById('pDjSn')?.value || '',
    djCondition: document.getElementById('pDjCondition')?.value ? Number(document.getElementById('pDjCondition').value) : '',
    programYear: document.getElementById('pProgramYear')?.value ? Number(document.getElementById('pProgramYear').value) : '',
    keyboard: document.getElementById('pKeyboard').value,
    color: getSelectOrOtherValue('pColorSelect', 'pColorOther'),
    cpu: getSelectOrOtherValue('pCpuSelect', 'pCpuOther'),
    battery: document.getElementById('pBattery').value,
    screenSize: document.getElementById('pScreenSize').value,
    images: document.getElementById('pImageList').value.split(',').filter(Boolean),
    units: getUnitsFromForm(),
    whatsapp: CONFIG.WHATSAPP_NUMBER,
    status: newStatus,
    soldDate: soldDate
  };

  const idx = allProducts.findIndex(x => x.id.toString() === product.id.toString());
  if (idx > -1) {
    allProducts[idx] = product;
  } else {
    allProducts.push(product);
  }

  const saveBtn = document.getElementById('saveBtn');
  const originalBtnText = saveBtn.innerText;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="loader-ring-sm"></span> ກຳລັງບັນທຶກ...';

  const ok = await persistProducts(idx > -1 ? `chore: update product ${product.id}` : `feat: add product ${product.id}`);

  saveBtn.disabled = false;
  saveBtn.innerText = originalBtnText;

  if (ok) {
    closeEditModal();
    renderAdminGrid();
  }
}

async function removeProduct(id) {
  if (!confirm('ຕ້ອງການລຶບສິນຄ້ານີ້ແທ້ບໍ?')) return;
  const backup = allProducts;
  allProducts = allProducts.filter(x => x.id.toString() !== id.toString());
  const ok = await persistProducts(`chore: delete product ${id}`);
  if (!ok) { allProducts = backup; return; }
  renderAdminGrid();
}

async function persistProducts(commitMessage) {
  showLoadingOverlay('ກຳລັງບັນທຶກ ແລະ commit ຂໍ້ມູນລົງ GitHub...');
  try {
    // ດຶງ sha ຫລ້າສຸດກ່ອນຂຽນທັບ ເພື່ອປ້ອງກັນຂໍ້ມູນຂັດແຍ່ງກັນ (ກໍລະນີແກ້ໄຂຈາກຫລາຍອຸປະກອນ)
    const current = await ghGetFile(CONFIG.PRODUCTS_PATH);
    await ghPutJson(CONFIG.PRODUCTS_PATH, allProducts, current.sha, commitMessage);
    hideLoadingOverlay();
    showToast('ບັນທຶກຂໍ້ມູນສຳເລັດແລ້ວ! (Commit ໄປ GitHub ແລ້ວ)', 'success');
    return true;
  } catch (err) {
    console.error(err);
    hideLoadingOverlay();
    showToast('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message, 'error', 6000);
    return false;
  }
}

/* =========================================================================
   ຈັດການ Serial Number (SN) ແຕ່ລະເຄື່ອງ — ບັນທຶກຢູ່ໃນ product.units (products.json)
   ແທນທີ່ລະບົບ colorStock ເກົ່າ (qty ຢ່າງດຽວ) ດ້ວຍ SN ຕົວຈິງຕໍ່ເຄື່ອງ + ສະຖານະ + ປະກັນ + ຝາກຂາຍ
   ========================================================================= */

// ລາຍການສີທີ່ອະນຸຍາດ (ຄົງທີ່ 5 ສີ ຕາມທີ່ຮ້ານກຳນົດ) — ໃຊ້ຮ່ວມກັບ pColorSelect
const COLOR_STOCK_OPTIONS = [
  { value: 'Space Gray', label: 'Space Gray (ສີເທົາ)' },
  { value: 'Silver', label: 'Silver (ສີເງິນ)' },
  { value: 'Rose Gold', label: 'Rose Gold (ສີຄຳກຸຫຼາບທອງ)' },
  { value: 'Midnight', label: 'Midnight (ສີດຳກາງຄືນ)' },
  { value: 'Starlight', label: 'Starlight (ສີແສງດາວ)' }
];

const WARRANTY_DAYS_DEFAULT = 30; // ຈຳນວນວັນຮັບປະກັນມາດຕະຖານ ເມື່ອຂາຍລູກຄ້າທົ່ວໄປ

let currentUnits = [];      // unit ຂອງສິນຄ້າທີ່ກຳລັງແກ້ໄຂຢູ່ໃນຟອມ
let activeUnitIndex = null; // index ຂອງ unit ທີ່ກຳລັງກົດ "ຂາຍ" ຫຼື "ຝາກຂາຍ" ຢູ່

function blankUnit() {
  return {
    sn: '', color: '', status: 'Ready',       // Ready | Sold | Consignment
    saleType: '', hasWarranty: false, soldDate: '', warrantyEndDate: '', cycleCount: '',
    salePrice: '',                             // ລາຄາຂາຍຈິງ (ໃສ່ຕອນຂາຍ ຫຼື ຕອນເພີ່ມ SN ກ່ອນຂາຍ)
    consignment: null                          // { partnerName, priceLAK, dateOut, dateSold }
  };
}

function addUnitRow() {
  currentUnits.push(blankUnit());
  renderUnitRows();
}

// ເພີ່ມຫຼາຍເຄື່ອງພ້ອມກັນ ໂດຍບໍ່ຕ້ອງໃສ່ SN ຕັ້ງແຕ່ທຳອິດ (ໃສ່ SN ພາຍຫຼັງເທື່ອລະເຄື່ອງຕອນຂາຍ/ກະກຽມເຄື່ອງ)
function bulkAddUnits() {
  const qty = Number(document.getElementById('bulkAddQty').value) || 0;
  if (qty <= 0) { showToast('ກະລຸນາໃສ່ຈຳນວນທີ່ຢາກເພີ່ມ', 'info'); return; }
  if (qty > 500) { showToast('ເພີ່ມເທື່ອລະບໍ່ເກີນ 500 ເຄື່ອງ', 'info'); return; }

  for (let i = 0; i < qty; i++) {
    const u = blankUnit();
    u.color = 'Space Gray'; // ສີເລີ່ມຕົ້ນ (ແອດມິນສາມາດປ່ຽນໄດ້ຕໍ່ຫຼັງ)
    currentUnits.push(u);
  }
  renderUnitRows();
  showToast(`ເພີ່ມ ${qty} ເຄື່ອງ (ສີເທົາ) ແລ້ວ — ປ່ຽນສີຫຼື SN ໄດ້ທຸກເວລາ`, 'success');
}

function removeUnitRow(index) {
  if (!confirm('ລຶບ SN ນີ້ອອກແທ້ບໍ?')) return;
  currentUnits.splice(index, 1);
  renderUnitRows();
}

function updateUnitField(index, field, value) {
  if (!currentUnits[index]) return;
  currentUnits[index][field] = value;
}

function updateUnitPriceField(index, displayValue) {
  if (!currentUnits[index]) return;
  const raw = Number(displayValue.replace(/[^\d]/g, '')) || '';
  currentUnits[index].salePrice = raw;
}

// ຍົກເລີກການຂາຍ → ກັບເປັນ "ພ້ອມຂາຍ" (ໃຊ້ກໍລະນີພິມຜິດ/ຍົກເລີກອໍເດີ)
function cancelUnitSale(index) {
  if (!confirm('ຍົກເລີກການຂາຍ SN ນີ້ ແລະ ເອົາກັບເປັນ "ພ້ອມຂາຍ" ແທ້ບໍ?')) return;
  currentUnits[index] = { ...currentUnits[index], status: 'Ready', saleType: '', hasWarranty: false, soldDate: '', warrantyEndDate: '' };
  renderUnitRows();
}

// ໝາຍວ່າຂາຍໄດ້ແລ້ວ (ຈາກສະຖານະຝາກຂາຍ) → ບັນທຶກ dateSold, ປ່ຽນເປັນ Sold
function markConsignmentSold(index) {
  const unit = currentUnits[index];
  if (!unit || !unit.consignment) return;
  unit.consignment.dateSold = new Date().toISOString().slice(0, 10);
  unit.status = 'Sold';
  unit.saleType = 'agent';
  unit.hasWarranty = false;
  unit.soldDate = unit.consignment.dateSold;
  renderUnitRows();
}

// ສົ່ງຄືນຮ້ານ (ຝາກຂາຍບໍ່ອອກ) → ກັບເປັນ "ພ້ອມຂາຍ"
function returnConsignmentUnit(index) {
  if (!confirm('ໝາຍວ່າສົ່ງເຄື່ອງນີ້ຄືນຮ້ານ (ຝາກຂາຍບໍ່ອອກ) ແທ້ບໍ?')) return;
  currentUnits[index] = { ...currentUnits[index], status: 'Ready', consignment: null };
  renderUnitRows();
}

/* ---------- Sell modal ---------- */
function openSellUnitModal(index) {
  activeUnitIndex = index;
  const unit = currentUnits[index];
  document.getElementById('sellUnitSnInput').value = unit.sn || '';
  document.getElementById('sellUnitCycleCount').value = unit.cycleCount || '';
  document.querySelector('input[name="sellType"][value="retail"]').checked = true;
  document.getElementById('sellUnitModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('sellUnitSnInput').focus(), 100);
}
function closeSellUnitModal() {
  document.getElementById('sellUnitModal').classList.add('hidden');
  activeUnitIndex = null;
}
function confirmSellUnit() {
  if (activeUnitIndex === null) return;

  const sn = document.getElementById('sellUnitSnInput').value.trim();
  if (!sn) { showToast('ກະລຸນາໃສ່ Serial Number ຂອງເຄື່ອງທີ່ຂາຍອອກໄປ', 'info'); return; }

  const cycleCount = document.getElementById('sellUnitCycleCount').value.trim();
  const sellType = document.querySelector('input[name="sellType"]:checked').value;
  const today = new Date().toISOString().slice(0, 10);
  const unit = currentUnits[activeUnitIndex];

  unit.sn = sn;
  unit.cycleCount = cycleCount ? Number(cycleCount) : '';
  // ເກັບລາຄາໄວ້ (ຖ້າໃສ່ໄວ້ໃນ row ກ່ອນຂາຍ; ບໍ່ overwrite ຖ້າໃສ່ໄວ້ຢູ່ແລ້ວ)
  if (!unit.salePrice) unit.salePrice = '';
  unit.status = 'Sold';
  unit.saleType = sellType;
  unit.soldDate = today;
  if (sellType === 'retail') {
    unit.hasWarranty = true;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + WARRANTY_DAYS_DEFAULT);
    unit.warrantyEndDate = expiry.toISOString().slice(0, 10);
  } else {
    unit.hasWarranty = false;
    unit.warrantyEndDate = '';
  }

  closeSellUnitModal();
  renderUnitRows();
  showToast('ບັນທຶກການຂາຍແລ້ວ — ຢ່າລືມກົດ "ບັນທຶກສິນຄ້າ" ເພື່ອ commit ຂຶ້ນ GitHub', 'success');
}

/* ---------- Consignment modal ---------- */
function openConsignUnitModal(index) {
  activeUnitIndex = index;
  const unit = currentUnits[index];
  document.getElementById('consignUnitSnInput').value = unit.sn || '';
  document.getElementById('consignPartnerName').value = '';
  document.getElementById('consignPriceLAK').value = '';
  document.getElementById('consignDateOut').value = new Date().toISOString().slice(0, 10);
  document.getElementById('consignUnitModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('consignUnitSnInput').focus(), 100);
}
function closeConsignUnitModal() {
  document.getElementById('consignUnitModal').classList.add('hidden');
  activeUnitIndex = null;
}
function confirmConsignUnit() {
  if (activeUnitIndex === null) return;

  const sn = document.getElementById('consignUnitSnInput').value.trim();
  if (!sn) { showToast('ກະລຸນາໃສ່ Serial Number ຂອງເຄື່ອງ', 'info'); return; }

  const partnerName = document.getElementById('consignPartnerName').value.trim();
  if (!partnerName) { showToast('ກະລຸນາໃສ່ຊື່ຮ້ານ/ໝູ່ທີ່ຝາກຂາຍ', 'info'); return; }

  const priceLAK = Number(document.getElementById('consignPriceLAK').value.replace(/[^\d]/g, '')) || 0;
  const dateOut = document.getElementById('consignDateOut').value || new Date().toISOString().slice(0, 10);

  const unit = currentUnits[activeUnitIndex];
  unit.sn = sn;
  unit.status = 'Consignment';
  unit.consignment = { partnerName, priceLAK, dateOut, dateSold: '' };

  closeConsignUnitModal();
  renderUnitRows();
  showToast('ບັນທຶກການຝາກຂາຍແລ້ວ — ຢ່າລືມກົດ "ບັນທຶກສິນຄ້າ" ເພື່ອ commit ຂຶ້ນ GitHub', 'success');
}

/* ---------- Render ---------- */
function renderUnitRows() {
  const container = document.getElementById('unitRows');
  if (currentUnits.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">ຍັງບໍ່ມີ SN, ກົດ "+ ເພີ່ມ SN" ຂ້າງລຸ່ມ</p>';
    return;
  }

  container.innerHTML = currentUnits.map((unit, index) => {
    const colorOptionsHtml = COLOR_STOCK_OPTIONS.map(o =>
      `<option value="${o.value}" ${o.value === unit.color ? 'selected' : ''}>${o.label}</option>`
    ).join('');

    const statusBadge = unit.status === 'Ready'
      ? '<span class="liquid-pill pill-ready">ພ້ອມຂາຍ</span>'
      : unit.status === 'Sold'
        ? '<span class="liquid-pill pill-out">ຂາຍແລ້ວ</span>'
        : '<span class="liquid-pill pill-low">ຝາກຂາຍ</span>';

    let detailLine = '';
    if (unit.status === 'Sold') {
      detailLine = `<p class="text-[10px] text-slate-400 mt-1">
        ${unit.saleType === 'retail' ? 'ຂາຍລູກຄ້າທົ່ວໄປ' : 'ຂາຍໃຫ້ຕົວແທນ'} · ວັນຂາຍ ${unit.soldDate || '-'}
        ${unit.hasWarranty ? ` · ປະກັນຮອດ ${unit.warrantyEndDate}` : ' · ບໍ່ມີປະກັນ'}
        ${unit.cycleCount ? ` · ຮອບຊາດ ${unit.cycleCount}` : ''}
        ${unit.salePrice ? ` · ລາຄາ <b class="text-rose-600">${Number(unit.salePrice).toLocaleString()} ₭</b>` : ''}
      </p>`;
    } else if (unit.status === 'Consignment' && unit.consignment) {
      const c = unit.consignment;
      detailLine = `<p class="text-[10px] text-slate-400 mt-1">
        ຝາກຮ້ານ "${c.partnerName}" · ລາຄາ ${Number(c.priceLAK).toLocaleString()} ₭ · ອອກວັນທີ ${c.dateOut}
        ${c.dateSold ? ` · ຂາຍໄດ້ ${c.dateSold}` : ''}
      </p>`;
    }

    let actionsHtml = '';
    if (unit.status === 'Ready') {
      actionsHtml = `
        <button type="button" onclick="openSellUnitModal(${index})" class="btn-press bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold">ຂາຍ</button>
        <button type="button" onclick="openConsignUnitModal(${index})" class="btn-press bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold">ຝາກຂາຍ</button>`;
    } else if (unit.status === 'Sold') {
      actionsHtml = `<button type="button" onclick="cancelUnitSale(${index})" class="btn-press bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold">ຍົກເລີກຂາຍ</button>`;
    } else if (unit.status === 'Consignment') {
      actionsHtml = `
        <button type="button" onclick="markConsignmentSold(${index})" class="btn-press bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold">ຂາຍໄດ້ແລ້ວ</button>
        <button type="button" onclick="returnConsignmentUnit(${index})" class="btn-press bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold">ສົ່ງຄືນຮ້ານ</button>`;
    }

    return `
      <div class="bg-slate-50 border border-slate-100 rounded-2xl p-3">
        <div class="flex items-center gap-2 flex-wrap">
          <input type="text" value="${unit.sn}" placeholder="Serial Number"
                 oninput="updateUnitField(${index}, 'sn', this.value)"
                 class="flex-1 min-w-[120px] bg-white border border-slate-200 p-2 rounded-lg text-xs font-mono">
          <input type="text" inputmode="numeric" value="${unit.salePrice ? Number(unit.salePrice).toLocaleString('en-US') : ''}" placeholder="ລາຄາຂາຍ ₭"
                 oninput="updateUnitPriceField(${index}, this.value)"
                 class="w-36 bg-white border border-rose-200 p-2 rounded-lg text-xs text-rose-700 font-semibold">
          <select onchange="updateUnitField(${index}, 'color', this.value)" class="w-32 bg-white border border-slate-200 p-2 rounded-lg text-xs">
            <option value="">-- ສີ --</option>
            ${colorOptionsHtml}
          </select>
          ${statusBadge}
          <button type="button" onclick="removeUnitRow(${index})" title="ລຶບ" class="btn-press shrink-0 w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs">🗑️</button>
        </div>
        ${detailLine}
        ${actionsHtml ? `<div class="flex gap-1.5 mt-2">${actionsHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ໂຫຼດ units ຂອງສິນຄ້າເຂົ້າຟອມ (ຕອນເປີດແກ້ໄຂ)
function setUnitsToForm(units) {
  currentUnits = Array.isArray(units) ? JSON.parse(JSON.stringify(units)) : [];
  renderUnitRows();
}

// ອ່ານ units ອອກຈາກຟອມ (ຕອນບັນທຶກ) — ເກັບໄວ້ທຸກແຖວ ເຖິງແມ່ນວ່າຍັງບໍ່ໄດ້ໃສ່ SN
// (ຮອງຮັບ Bulk Add: ເພີ່ມຫຼາຍເຄື່ອງກ່ອນ, ໃສ່ SN ພາຍຫຼັງເທື່ອລະເຄື່ອງໄດ້)
function getUnitsFromForm() {
  return currentUnits.map(u => ({ ...u, sn: (u.sn || '').trim() }));
}
