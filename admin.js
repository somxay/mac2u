/* =========================================================================
   admin.js — ໜ້າຫຼັງບ້ານ (admin.html)
   ອ່ານ/ຂຽນ data/products.json ແລະ data/settings.json ໂດຍກົງຜ່ານ GitHub Contents API
   ໂດຍໃຊ້ Personal Access Token (PAT) ຂອງແອດມິນ (ບໍ່ໄດ້ຖືກເກັບໄວ້ຢູ່ໃສນອກຈາກ browser ຂອງທ່ານ)
   ========================================================================= */

let allProducts = [];
let githubToken = '';
let currentEditId = null;

document.getElementById('repoLabel').innerText = `${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}`;

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

function setSaveStatus(text, isError) {
  const el = document.getElementById('saveStatus');
  el.classList.remove('hidden');
  el.className = `bg-${isError ? 'rose' : 'amber'}-50 border border-${isError ? 'rose' : 'amber'}-200 text-${isError ? 'rose' : 'amber'}-700 text-xs px-4 py-2.5 rounded-2xl`;
  el.innerText = text;
  if (!isError) setTimeout(() => el.classList.add('hidden'), 4000);
}

async function doLogin() {
  const tokenInput = document.getElementById('loginToken').value.trim();
  if (!tokenInput) return;
  githubToken = tokenInput;

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
    loadData();
  } catch (err) {
    console.error(err);
    document.getElementById('loginError').classList.remove('hidden');
  }
}
document.getElementById('loginToken').addEventListener('keydown', e => {
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
  document.getElementById('adminLoading').style.display = 'block';
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
    document.getElementById('adminLoading').innerText = 'ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນ: ' + err.message;
  }
}

/* --------------------------------- Settings --------------------------------- */

async function saveExchangeRate() {
  const lakToThb = Number(document.getElementById('settingRateLakToThb').value);
  const thbToLak = Number(document.getElementById('settingRateThbToLak').value);
  if (!lakToThb || lakToThb <= 0 || !thbToLak || thbToLak <= 0) {
    alert('ກະລຸນາໃສ່ຕົວເລກອັດຕາແລກປ່ຽນທັງສອງຊ່ອງໃຫ້ຖືກຕ້ອງ');
    return;
  }
  try {
    setSaveStatus('ກຳລັງບັນທຶກອັດຕາແລກປ່ຽນ...', false);
    const current = await ghGetFile(CONFIG.SETTINGS_PATH);
    await ghPutJson(CONFIG.SETTINGS_PATH, { exchangeRate: lakToThb, thbToLakRate: thbToLak }, current.sha,
      'chore: update exchange rate via admin panel');
    setSaveStatus('ອັບເດດອັດຕາແລກປ່ຽນສຳເລັດແລ້ວ!', false);
  } catch (err) {
    console.error(err);
    setSaveStatus('ເກີດຂໍ້ຜິດພາດ: ' + err.message, true);
  }
}

/* --------------------------------- Products grid --------------------------------- */

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
    const statusColor = p.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : (p.status === 'Reserved' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600');
    const mainImg = (p.images && p.images.length > 0 && p.images[0]) ? p.images[0] : 'https://placehold.co/300x220?text=No+Image';

    return `
      <div class="bg-white rounded-3xl-custom border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div class="relative h-36 bg-slate-100">
          <img src="${mainImg}" class="w-full h-full object-cover">
          <span class="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusColor} bg-white/90 shadow-sm">${statusText}</span>
          <span class="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900/70 text-white">ID: ${p.id}</span>
        </div>
        <div class="p-3 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">${p.category}</span>
            <h3 class="font-bold text-slate-800 text-xs mt-0.5 line-clamp-2">${p.title}</h3>
            <p class="text-rose-600 font-bold text-xs mt-1">${p.priceLAK > 0 ? Number(p.priceLAK).toLocaleString() + ' ₭' : (p.priceTHB > 0 ? Number(p.priceTHB).toLocaleString() + ' ฿' : '-')}</p>
          </div>
          <div class="flex gap-2 mt-2">
            <button onclick="openEditModal('${p.id}')" title="ແກ້ໄຂ" class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-xl text-sm">✏️</button>
            <button onclick="removeProduct('${p.id}')" title="ລຶບ" class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl text-sm">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* --------------------------------- Price input helpers --------------------------------- */

function formatPriceInput(el) {
  const raw = el.value.replace(/[^\d]/g, '');
  el.value = raw ? Number(raw).toLocaleString('en-US') : '';
}
function parsePriceInput(id) {
  const raw = document.getElementById(id).value.replace(/[^\d]/g, '');
  return raw ? Number(raw) : 0;
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
    document.getElementById('pOldPriceLAK').value = p.oldPriceLAK ? Number(p.oldPriceLAK).toLocaleString('en-US') : '';
    document.getElementById('pPriceTHB').value = p.priceTHB ? Number(p.priceTHB).toLocaleString('en-US') : '';
    document.getElementById('pOldPriceTHB').value = p.oldPriceTHB ? Number(p.oldPriceTHB).toLocaleString('en-US') : '';
    document.getElementById('pRam').value = p.ram || '';
    document.getElementById('pSsd').value = p.ssd || '';
    document.getElementById('pYear').value = p.year || '';
    document.getElementById('pKeyboard').value = p.keyboard || 'TH';
    document.getElementById('pBattery').value = p.battery || '';
    document.getElementById('pScreenSize').value = p.screenSize || '';
    document.getElementById('pWarrantyDays').value = p.warrantyDays || '';
    document.getElementById('pStatus').value = p.status;
    document.getElementById('pImageList').value = p.images ? p.images.join(',') : '';
    renderImagePreviews();
  }

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

function uploadImage(input) {
  if (!(input.files && input.files[0])) return;
  const file = input.files[0];
  const emoji = document.getElementById('uploadEmoji');
  emoji.innerHTML = '⏳';

  if (file.size > 2 * 1024 * 1024) {
    alert('ຮູບພາບໃຫຍ່ເກີນ 2MB — ກະລຸນາຫຍໍ້ຂະໜາດຮູບກ່ອນອັບໂຫຼດ ເພື່ອຄວາມໄວຂອງເວັບໄຊ');
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const base64Data = e.target.result.split(',')[1];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${CONFIG.IMAGES_PATH}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

      await ghPutImage(fileName, base64Data, `feat: upload product image ${fileName}`);

      const url = ghCdnUrl(fileName);
      let current = document.getElementById('pImageList').value;
      document.getElementById('pImageList').value = current ? current + ',' + url : url;
      renderImagePreviews();
      emoji.innerHTML = '✅';
    } catch (err) {
      console.error(err);
      emoji.innerHTML = '❌';
      alert('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ: ' + err.message);
    } finally {
      setTimeout(() => { emoji.innerHTML = ''; }, 3000);
    }
  };
  reader.readAsDataURL(file);
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
    oldPriceLAK: parsePriceInput('pOldPriceLAK'),
    priceTHB: priceTHB,
    oldPriceTHB: parsePriceInput('pOldPriceTHB'),
    ram: document.getElementById('pRam').value,
    ssd: document.getElementById('pSsd').value,
    year: document.getElementById('pYear').value,
    keyboard: document.getElementById('pKeyboard').value,
    battery: document.getElementById('pBattery').value,
    screenSize: document.getElementById('pScreenSize').value,
    warrantyDays: Number(document.getElementById('pWarrantyDays').value) || 0,
    repairHistory: existing ? (existing.repairHistory || '') : '',
    images: document.getElementById('pImageList').value.split(',').filter(Boolean),
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

  await persistProducts(idx > -1 ? `chore: update product ${product.id}` : `feat: add product ${product.id}`);
  closeEditModal();
  renderAdminGrid();
}

async function removeProduct(id) {
  if (!confirm('ຕ້ອງການລຶບສິນຄ້ານີ້ແທ້ບໍ?')) return;
  allProducts = allProducts.filter(x => x.id.toString() !== id.toString());
  await persistProducts(`chore: delete product ${id}`);
  renderAdminGrid();
}

async function persistProducts(commitMessage) {
  try {
    setSaveStatus('ກຳລັງບັນທຶກ ແລະ commit ຂໍ້ມູນລົງ GitHub...', false);
    // ດຶງ sha ຫລ້າສຸດກ່ອນຂຽນທັບ ເພື່ອປ້ອງກັນຂໍ້ມູນຂັດແຍ່ງກັນ (ກໍລະນີແກ້ໄຂຈາກຫລາຍອຸປະກອນ)
    const current = await ghGetFile(CONFIG.PRODUCTS_PATH);
    await ghPutJson(CONFIG.PRODUCTS_PATH, allProducts, current.sha, commitMessage);
    setSaveStatus('ບັນທຶກຂໍ້ມູນສຳເລັດແລ້ວ! (Commit ໄປ GitHub ແລ້ວ)', false);
  } catch (err) {
    console.error(err);
    setSaveStatus('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message, true);
    alert('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message);
  }
}
