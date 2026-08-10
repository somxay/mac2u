/* =========================================================================
   agent.js — ໜ້າລາຄາສົ່ງ (agent.html)
   ຄວາມປອດໄພ: ນີ້ເປັນ static site, ດັ່ງນັ້ນການກວດລະຫັດເກີດຂຶ້ນຝັ່ງ browser (client-side)
   ລະຫັດຖືກເກັບເປັນ SHA-256 hash (ບໍ່ແມ່ນ plain text) ເພື່ອບໍ່ໃຫ້ເຫັນຄ່າຕົງໆຈາກ view-source
   ແຕ່ນີ້ຍັງເປັນພຽງ "ອຸປະສັກເບື້ອງຕົ້ນ" (obscurity) ບໍ່ແມ່ນກຳແພງຄວາມປອດໄພແທ້ — ຄົນທີ່ຮູ້ວິທີເທັກນິກ
   ຍັງສາມາດຫາ URL ຂອງ agent_products.json ໂດຍກົງໄດ້ຢູ່ດີ ຖ້າ repo ເປັນ public (ອ່ານລາຍລະອຽດໃນ DEPLOY.md)
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

// ---------- ດຶງຂໍ້ມູນລາຄາສົ່ງ ----------
async function loadAgentProducts() {
  try {
    const res = await fetch(ghRawUrl(CONFIG.AGENT_PRODUCTS_PATH));
    if (!res.ok) throw new Error('ไม่พบ ' + CONFIG.AGENT_PRODUCTS_PATH);
    agentProducts = await res.json();
    document.getElementById('agentLoading').style.display = 'none';
    renderAgentGrid();
  } catch (err) {
    console.error(err);
    document.getElementById('agentLoading').innerHTML =
      '<p class="col-span-full text-center text-xs text-rose-500 py-10">ໂຫຼດຂໍ້ມູນລາຄາສົ່ງບໍ່ສຳເລັດ, ລອງໃໝ່ພາຍຫຼັງ</p>';
  }
}

// ---------- ຈັດຮູບແບບເງິນກີບ (Intl.NumberFormat) ----------
const lakFormatter = new Intl.NumberFormat('en-US');
function formatLak(amount) {
  return lakFormatter.format(Number(amount) || 0) + ' ₭';
}

function renderAgentGrid() {
  const grid = document.getElementById('agentGrid');
  if (agentProducts.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-xs text-slate-400 py-10">ຍັງບໍ່ມີລາຍການລາຄາສົ່ງ</p>';
    return;
  }

  grid.innerHTML = agentProducts.map(p => `
    <div class="product-card glass-card rounded-3xl-custom p-4">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">${p.category || ''}</span>
        <span class="text-[10px] font-bold bg-slate-900/5 text-slate-500 px-2 py-0.5 rounded-full">ID ${p.id}</span>
      </div>
      <h3 class="font-bold text-slate-800 text-sm mb-1">${p.title}</h3>
      <p class="text-[11px] text-slate-400 mb-3">
        ${[p.cpu, p.ram ? p.ram + ' GB' : '', p.ssd ? p.ssd + ' GB' : '', p.color].filter(Boolean).join(' · ') || '-'}
      </p>
      <div class="flex items-baseline justify-between border-t border-slate-100 pt-3">
        <div>
          <span class="text-[10px] text-slate-400 block">ລາຄາສົ່ງ</span>
          <span class="text-rose-600 font-extrabold text-lg">${formatLak(p.wholesalePriceLAK)}</span>
        </div>
        ${p.moq ? `<span class="text-[10px] text-slate-400">ຂັ້ນຕ່ຳ ${p.moq} ເຄື່ອງ</span>` : ''}
      </div>
    </div>
  `).join('');
}
