/* =========================================================================
   consignment.js — ລະບົບຝາກຂາຍ (consignment.html)
   ໃຊ້ GitHub Personal Access Token ດຽວກັນກັບ admin.html (ຕ້ອງມີສິດຂຽນ repo)
   ອ່ານ/ຂຽນ products.json ໂດຍກົງຜ່ານ GitHub Contents API (ຄືກັນກັບ admin.js)
   ========================================================================= */

let githubToken = '';
let allProducts = [];

/* ---------------------------- GitHub API helpers (ຄັດລອກມາຈາກ admin.js) ---------------------------- */

function ghHeaders() {
  return {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}
function b64EncodeUnicode(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64DecodeUnicode(str) { return decodeURIComponent(escape(atob(str))); }

async function ghGetFile(path) {
  const res = await fetch(ghApiContentsUrl(path) + `?ref=${CONFIG.GITHUB_BRANCH}&_=${Date.now()}`, { headers: ghHeaders() });
  if (res.status === 404) return { exists: false, sha: null, json: null };
  if (!res.ok) throw new Error(`GitHub API error (${res.status}) ອ່ານ ${path} ບໍ່ໄດ້`);
  const data = await res.json();
  const text = b64DecodeUnicode(data.content.replace(/\n/g, ''));
  return { exists: true, sha: data.sha, json: JSON.parse(text) };
}
async function ghPutJson(path, obj, sha, message) {
  const body = { message, content: b64EncodeUnicode(JSON.stringify(obj, null, 2)), branch: CONFIG.GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(ghApiContentsUrl(path), { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Commit ${path} ບໍ່ສຳເລັດ (${res.status}): ${errBody.message || ''}`);
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
  btn.innerHTML = '<span class="loader-ring-sm"></span> ກຳລັງກວດສອບ...';

  try {
    await ghGetFile(CONFIG.PRODUCTS_PATH);
    sessionStorage.setItem('consignment_token', githubToken);
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('loginError').classList.add('hidden');
    showToast('ເຂົ້າສູ່ລະບົບສຳເລັດແລ້ວ!', 'success');
    loadConsignmentData();
  } catch (err) {
    console.error(err);
    document.getElementById('loginError').classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}
document.getElementById('loginToken').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doLogout() {
  githubToken = '';
  sessionStorage.removeItem('consignment_token');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

(function autoLogin() {
  const saved = sessionStorage.getItem('consignment_token');
  if (saved) {
    githubToken = saved;
    ghGetFile(CONFIG.PRODUCTS_PATH).then(() => {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadConsignmentData();
    }).catch(() => { githubToken = ''; });
  }
})();

/* --------------------------------- Data load --------------------------------- */

async function loadConsignmentData() {
  document.getElementById('consignLoading').style.display = 'block';
  document.getElementById('consignList').innerHTML = '';
  try {
    const file = await ghGetFile(CONFIG.PRODUCTS_PATH);
    allProducts = file.json || [];
    document.getElementById('consignLoading').style.display = 'none';
    renderConsignList();
  } catch (err) {
    console.error(err);
    document.getElementById('consignLoading').innerHTML = '<p class="text-rose-500">ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ: ' + err.message + '</p>';
  }
}

// ດຶງ unit ທັງໝົດຈາກທຸກສິນຄ້າທີ່ status === 'Consignment' ອອກມາເປັນ list ດຽວ ພ້ອມຂໍ້ມູນສິນຄ້າແມ່
function getConsignedUnits() {
  const list = [];
  allProducts.forEach(p => {
    if (!Array.isArray(p.units)) return;
    p.units.forEach((u, unitIndex) => {
      if (u.status === 'Consignment') {
        list.push({ product: p, unit: u, unitIndex });
      }
    });
  });
  return list;
}

function renderConsignList() {
  const box = document.getElementById('consignList');
  const items = getConsignedUnits();

  if (items.length === 0) {
    box.innerHTML = '<p class="text-center text-xs text-slate-400 py-10 glass-card rounded-3xl-custom">ຍັງບໍ່ມີເຄື່ອງຝາກຂາຍຢູ່</p>';
    return;
  }

  box.innerHTML = items.map(({ product: p, unit: u, unitIndex }) => {
    const specs = [u.color ? colorLabelLao(u.color) : '', p.cpu, p.ram ? p.ram + ' GB' : '', p.ssd ? p.ssd + ' GB' : '', p.year, p.screenSize]
      .filter(Boolean).join(' · ');
    const c = u.consignment || {};
    return `
      <div class="glass-card rounded-2xl-custom p-4">
        <div class="flex items-start justify-between gap-3 mb-1">
          <div class="min-w-0">
            <p class="font-bold text-slate-800 text-sm">${p.title}</p>
            <p class="text-[10px] text-slate-400 mt-0.5 font-mono">SN: ${u.sn}</p>
            ${specs ? `<p class="text-[11px] text-slate-400 mt-1">${specs}</p>` : ''}
          </div>
          <div class="text-right shrink-0">
            <span class="text-[9px] text-slate-400 block">ລາຄາຝາກຂາຍ</span>
            <span class="text-amber-600 font-extrabold text-sm">${Number(c.priceLAK || 0).toLocaleString()} ₭</span>
          </div>
        </div>
        <p class="text-[10px] text-slate-400 mt-1">ຝາກຮ້ານ "<b class="text-slate-600">${c.partnerName || '-'}</b>" · ອອກວັນທີ ${c.dateOut || '-'}</p>
        <div class="flex gap-2 mt-3">
          <button onclick="markUnitSold('${p.id}', ${unitIndex})" class="btn-press flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-xl text-xs font-semibold">ຂາຍໄດ້ແລ້ວ</button>
          <button onclick="returnUnit('${p.id}', ${unitIndex})" class="btn-press flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold">ສົ່ງຄືນຮ້ານ</button>
        </div>
      </div>
    `;
  }).join('');
}

function colorLabelLao(color) {
  const map = {
    'Space Gray': 'ສີເທົາ', 'Silver': 'ສີເງິນ', 'Rose Gold': 'ສີຄຳກຸຫຼາບທອງ',
    'Midnight': 'ສີດຳກາງຄືນ', 'Starlight': 'ສີແສງດາວ'
  };
  return map[color] || color || '';
}

/* --------------------------------- Actions (write ກັບຄືນ GitHub) --------------------------------- */

async function persistProducts(commitMessage) {
  showLoadingOverlay('ກຳລັງບັນທຶກ...');
  try {
    const current = await ghGetFile(CONFIG.PRODUCTS_PATH);
    await ghPutJson(CONFIG.PRODUCTS_PATH, allProducts, current.sha, commitMessage);
    hideLoadingOverlay();
    return true;
  } catch (err) {
    console.error(err);
    hideLoadingOverlay();
    showToast('ບັນທຶກບໍ່ສຳເລັດ: ' + err.message, 'error', 6000);
    return false;
  }
}

async function markUnitSold(productId, unitIndex) {
  const product = allProducts.find(p => p.id.toString() === productId.toString());
  if (!product || !product.units[unitIndex]) return;
  const unit = product.units[unitIndex];

  const today = new Date().toISOString().slice(0, 10);
  unit.consignment.dateSold = today;
  unit.status = 'Sold';
  unit.saleType = 'agent';
  unit.hasWarranty = false;
  unit.soldDate = today;

  const ok = await persistProducts(`chore: consignment unit sold — ${product.id} / ${unit.sn}`);
  if (ok) { showToast('ບັນທຶກການຂາຍແລ້ວ!', 'success'); renderConsignList(); }
}

async function returnUnit(productId, unitIndex) {
  if (!confirm('ໝາຍວ່າສົ່ງເຄື່ອງນີ້ຄືນຮ້ານ (ຝາກຂາຍບໍ່ອອກ) ແທ້ບໍ?')) return;
  const product = allProducts.find(p => p.id.toString() === productId.toString());
  if (!product || !product.units[unitIndex]) return;

  product.units[unitIndex].status = 'Ready';
  product.units[unitIndex].consignment = null;

  const ok = await persistProducts(`chore: consignment unit returned — ${product.id} / ${product.units[unitIndex].sn}`);
  if (ok) { showToast('ບັນທຶກການສົ່ງຄືນແລ້ວ!', 'success'); renderConsignList(); }
}

/* --------------------------------- ລາຍງານປະຈຳເດືອນ --------------------------------- */

function generateMonthlyReport() {
  const monthStr = document.getElementById('reportMonth').value; // "YYYY-MM"
  const resultBox = document.getElementById('reportResult');
  if (!monthStr) { showToast('ກະລຸນາເລືອກເດືອນກ່ອນ', 'info'); return; }

  const rows = [];
  allProducts.forEach(p => {
    if (!Array.isArray(p.units)) return;
    p.units.forEach(u => {
      if (u.consignment && u.consignment.dateSold && u.consignment.dateSold.startsWith(monthStr)) {
        rows.push({ product: p, unit: u });
      }
    });
  });

  resultBox.classList.remove('hidden');
  if (rows.length === 0) {
    resultBox.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ບໍ່ພົບການຂາຍຝາກຂາຍໃນເດືອນນີ້</p>';
    return;
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.unit.consignment.priceLAK) || 0), 0);
  resultBox.innerHTML = `
    <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 mb-2 flex items-center justify-between">
      <span class="text-xs font-bold text-indigo-700">ລວມ ${rows.length} ເຄື່ອງ</span>
      <span class="text-sm font-extrabold text-indigo-700">${total.toLocaleString()} ₭</span>
    </div>
    <div class="space-y-1.5 max-h-64 overflow-y-auto">
      ${rows.map(r => `
        <div class="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-xl px-3 py-2">
          <div class="min-w-0">
            <p class="font-semibold text-slate-700 truncate">${r.product.title} <span class="text-slate-400 font-mono">(${r.unit.sn})</span></p>
            <p class="text-[10px] text-slate-400">ຝາກຮ້ານ ${r.unit.consignment.partnerName} · ຂາຍວັນທີ ${r.unit.consignment.dateSold}</p>
          </div>
          <span class="font-bold text-slate-700 shrink-0">${Number(r.unit.consignment.priceLAK).toLocaleString()} ₭</span>
        </div>
      `).join('')}
    </div>
  `;
}
