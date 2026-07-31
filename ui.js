/* =========================================================================
   ui.js — ລະບົບ UI ຮ່ວມກັນລະຫວ່າງ index.html ແລະ admin.html
   ປະກອບດ້ວຍ: Toast Notification + Ripple micro-interaction ເທິງປຸ່ມ
   ========================================================================= */

function ensureToastContainer() {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4';
    document.body.appendChild(c);
  }
  return c;
}

const TOAST_ICON = {
  success: 'fa-circle-check text-emerald-400',
  error: 'fa-circle-exclamation text-rose-400',
  info: 'fa-circle-info text-indigo-300',
  loading: 'fa-spinner fa-spin text-slate-300'
};

/**
 * ສະແດງ Toast Notification ງາມໆ
 * @param {string} message - ຂໍ້ຄວາມ
 * @param {'success'|'error'|'info'|'loading'} type
 * @param {number} duration - ms ກ່ອນຫາຍໄປ (0 = ຄ້າງໄວ້, ໃຊ້ກັບ loading ແລ້ວປິດເອງດ້ວຍ dismissToast)
 * @returns {HTMLElement} element ຂອງ toast (ໃຊ້ dismissToast(el) ປິດເອງໄດ້)
 */
function showToast(message, type = 'success', duration = 3200) {
  const container = ensureToastContainer();
  const el = document.createElement('div');
  el.className = 'toast-item pointer-events-auto w-full bg-slate-900/95 text-white backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/30 text-xs font-semibold flex items-center gap-3 ring-1 ring-white/10';
  el.innerHTML = `<i class="fas ${TOAST_ICON[type] || TOAST_ICON.success} text-sm shrink-0"></i><span class="leading-snug">${message}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('toast-show')));
  if (type !== 'loading' && duration) {
    setTimeout(() => dismissToast(el), duration);
  }
  return el;
}

function dismissToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.remove('toast-show');
  el.classList.add('toast-hide');
  setTimeout(() => el.remove(), 280);
}

/* ---------- Ripple micro-interaction: ໃສ່ class "btn-press" ຫຼື "ripple" ໃນປຸ່ມໃດກໍ່ໄດ້ ---------- */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn-press, .ripple');
  if (!btn || btn.disabled) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  const circle = document.createElement('span');
  circle.className = 'ripple-effect';
  circle.style.width = circle.style.height = size + 'px';
  circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
  circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
  if (getComputedStyle(btn).position === 'static') btn.classList.add('ripple-relative');
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 650);
}, true);

/* ---------- Full-screen glass loading overlay (ໃຊ້ຢູ່ admin.js ຕອນ commit ຂຶ້ນ GitHub) ---------- */
function showLoadingOverlay(message) {
  let el = document.getElementById('globalLoadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'globalLoadingOverlay';
    el.className = 'fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center';
    el.innerHTML = `
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl-custom px-8 py-7 shadow-2xl flex flex-col items-center gap-3 ring-1 ring-white/40">
        <div class="loader-ring"></div>
        <p id="globalLoadingText" class="text-xs font-semibold text-slate-600"></p>
      </div>`;
    document.body.appendChild(el);
  }
  document.getElementById('globalLoadingText').innerText = message || 'ກຳລັງດຳເນີນການ...';
  el.classList.remove('hidden');
}
function hideLoadingOverlay() {
  const el = document.getElementById('globalLoadingOverlay');
  if (el) el.classList.add('hidden');
}
