/* =========================================================================
   agent.js — ໜ້າລາຄາສົ່ງ (agent.html)
   ຄວາມປອດໄພ: ນີ້ເປັນ static site, ດັ່ງນັ້ນການກວດລະຫັດເກີດຂຶ້ນຝັ່ງ browser (client-side)
   ລະຫັດຖືກເກັບເປັນ SHA-256 hash (ບໍ່ແມ່ນ plain text) ເພື່ອບໍ່ໃຫ້ເຫັນຄ່າຕົງໆຈາກ view-source
   ແຕ່ນີ້ຍັງເປັນພຽງ "ອຸປະສັກເບື້ອງຕົ້ນ" (obscurity) ບໍ່ແມ່ນກຳແພງຄວາມປອດໄພແທ້ — ຄົນທີ່ຮູ້ວິທີເທັກນິກ
   ຍັງສາມາດເປີດ products.json ໂດຍກົງໄດ້ຢູ່ດີ ຖ້າ repo ເປັນ public (ອ່ານລາຍລະອຽດໃນ DEPLOY.md ຂໍ້ 6)
   ========================================================================= */

const AGENT_SESSION_KEY = 'agent_authed';
let agentProducts = [];

// ---------- SHA-256 hash (ໃຊ້ Web Crypto API ທີ່ browser ມີໃຫ້ໃນຕົວ) ----------
async function hashAgentCode(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAgentCode() {
  const input = document.getElementById('agentCodeInput');
  const code = input.value.trim();
  const btn = document.getElementById('gateSubmitBtn');
  if (!code) return;

  btn.disabled = true;
  const hash = await hashAgentCode(code);

  if (hash === CONFIG.AGENT_CODE_HASH) {
    sessionStorage.setItem(AGENT_SESSION_KEY, '1');
    unlockAgentPage();
  } else {
    document.getElementById('gateError').classList.remove('hidden');
    input.value = '';
    input.focus();
  }
  btn.disabled = false;
}

document.getElementById('agentCodeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAgentCode();
});

function agentLogout() {
  sessionStorage.removeItem(AGENT_SESSION_KEY);
  document.getElementById('agentContent').classList.add('hidden');
  document.getElementById('gateScreen').classList.remove('hidden');
  document.getElementById('agentCodeInput').value = '';
}

function unlockAgentPage() {
  document.getElementById('gateScreen').classList.add('hidden');
  document.getElementById('agentContent').classList.remove('hidden');
  loadAgentProducts();
}

// ຖ້າ session ຍັງມີຢູ່ (ຍັງບໍ່ໄດ້ປິດແທັບ/ browser) ໃຫ້ຂ້າມໜ້າຖາມລະຫັດ
(function autoUnlock() {
  if (sessionStorage.getItem(AGENT_SESSION_KEY) === '1') {
    unlockAgentPage();
  }
})();

// ---------- ດຶງຂໍ້ມູນສິນຄ້າ (ຊຸດດຽວກັບໜ້າຮ້ານ products.json — ລາຄາສົ່ງເປັນ field ໃນສິນຄ້ານັ້ນເລີຍ) ----------
async function loadAgentProducts() {
  try {
    const res = await fetch(ghRawUrl(CONFIG.PRODUCTS_PATH));
    if (!res.ok) throw new Error('ไม่พบ ' + CONFIG.PRODUCTS_PATH);
    agentProducts = await res.json();
    document.getElementById('agentLoading').style.display = 'none';
    renderAgentList();
  } catch (err) {
    console.error(err);
    document.getElementById('agentLoading').innerHTML =
      '<p class="text-center text-xs text-rose-500 py-10">ໂຫຼດຂໍ້ມູນສິນຄ້າບໍ່ສຳເລັດ, ລອງໃໝ່ພາຍຫຼັງ</p>';
  }
}

// ---------- ຈັດຮູບແບບເງິນກີບ (Intl.NumberFormat) ----------
const lakFormatter = new Intl.NumberFormat('en-US');
function formatLak(amount) {
  return lakFormatter.format(Number(amount) || 0) + ' ₭';
}

// ຄີບອດ → ແປງລະຫັດ (TH/EN ฯลฯ) ໃຫ້ເປັນຂໍ້ຄວາມທີ່ອ່ານເຂົ້າໃຈງ່າຍ (ຄັດລອກມາຈາກ app.js — ຢູ່ຄົນລະ script scope)
function formatKeyboard(kb) {
  const map = {
    'TH': 'ຄີບອດໄທ',
    'EN': 'ຄີບອດອັງກິດ',
    'US': 'ຄີບອດອັງກິດ',
    'LA': 'ຄີບອດລາວ'
  };
  return map[(kb || '').toUpperCase()] || kb || '';
}

function agentColorLabel(color) {
  const map = {
    'Space Gray': 'ສີເທົາອາວະກາດ', 'Silver': 'ສີເງິນ', 'Gold': 'ສີຄຳ', 'Rose Gold': 'ສີຄຳກຸຫຼາບ',
    'Midnight': 'ສີດຳຄ່ຳຄືນ', 'Starlight': 'ສີແສງດາວ', 'Sky Blue': 'ສີຟ້າ', 'Black': 'ສີດຳ', 'White': 'ສີຂາວ'
  };
  return map[color] || color || '';
}

// ---------- ສະແດງແບບ Minimalist List (ແຖວລົງມາ, ບໍ່ແມ່ນ card grid) ----------
function renderAgentList() {
  const box = document.getElementById('agentList');
  if (agentProducts.length === 0) {
    box.innerHTML = '<p class="text-center text-xs text-slate-400 py-10">ຍັງບໍ່ມີສິນຄ້າ</p>';
    return;
  }

  box.innerHTML = agentProducts.map(p => {
    const hasColorStock = p.colorStock && typeof p.colorStock === 'object' && Object.keys(p.colorStock).length > 0;
    const specs = [p.cpu, p.ram ? p.ram + ' GB' : '', p.ssd ? p.ssd + ' GB' : '', p.year, p.screenSize, p.battery, p.keyboard ? formatKeyboard(p.keyboard) : '']
      .filter(Boolean).join(' · ');

    return `
      <div class="p-4 hover:bg-slate-50/60 transition">
        <div class="flex items-start justify-between gap-3 mb-1">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-slate-800 text-sm">${p.title}</h3>
              <span class="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">ID ${p.id}</span>
              <span class="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">${p.category || ''}</span>
              ${!hasColorStock && p.color ? `<span class="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">${agentColorLabel(p.color)}</span>` : ''}
            </div>
            ${specs ? `<p class="text-[11px] text-slate-400 mt-1">${specs}</p>` : ''}
          </div>
          <div class="text-right shrink-0">
            <span class="text-[9px] text-slate-400 block">ລາຄາສົ່ງ</span>
            <span class="text-rose-600 font-extrabold text-base">${formatLak(p.wholesalePriceLAK)}</span>
            ${p.priceLAK ? `<p class="text-[9px] text-slate-300">ຂາຍ ${formatLak(p.priceLAK)}</p>` : ''}
          </div>
        </div>

        ${hasColorStock ? `
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${Object.entries(p.colorStock).map(([color, qty]) => `
              <span class="text-[10px] font-semibold px-2.5 py-1 rounded-full ${Number(qty) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-400 line-through'}">
                ${agentColorLabel(color)}: ${Number(qty) > 0 ? qty + ' ເຄື່ອງ' : 'ໝົດ'}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}
