/* =========================================================================
   config.js
   ບ່ອນດຽວທີ່ຕ້ອງແກ້ ເມື່ອທ່ານ Deploy ຄັ້ງທຳອິດ (ຫຼືປ່ຽນ Repository ໃໝ່).
   ໜ້າ index.html ແລະ admin.html ຈະດຶງຄ່າຈາກໄຟລ໌ນີ້ຮ່ວມກັນ.
   ບໍ່ມີ path/URL ໃດ hardcode ໄວ້ກັບໂດເມນເກົ່າ — ໃຊ້ໄດ້ທັນທີເມື່ອຜູກ Custom Domain.
   ========================================================================= */

const CONFIG = {
  // ---- GitHub Repository ທີ່ໃຊ້ເກັບ data/products.json, data/settings.json, images/ ----
GITHUB_OWNER: 'somxay',
GITHUB_REPO: 'mac2u',
GITHUB_BRANCH: 'main',
  // ---- Paths ພາຍໃນ Repository ----
 // Paths ພາຍໃນ Repository
PRODUCTS_PATH: 'products.json',
SETTINGS_PATH: 'settings.json',
IMAGES_DIR: 'images/',

  // ---- ຂໍ້ມູນຮ້ານ ----
  WHATSAPP_NUMBER: '22258416',
  STORE_NAME: 'Mac & DJ Store',

  // ---- Facebook Messenger Share (ບໍ່ບັງຄັບ) ----
  // ຖ້າຢາກໃຊ້ Facebook Send Dialog ແບບເຕັມຮູບແບບ (popup ຢູ່ desktop), ຕ້ອງສ້າງ Facebook App
  // ຢູ່ https://developers.facebook.com/apps ແລ້ວໃສ່ App ID ຢູ່ນີ້. ຖ້າປ່ອຍວ່າງ, ປຸ່ມ Messenger
  // ຈະໃຊ້ URL scheme ຂອງ Messenger ໂດຍກົງແທນ (ໃຊ້ໄດ້ດີເທິງມືຖືທີ່ລົງແອັບ Messenger ໄວ້).
  FACEBOOK_APP_ID: '',

  // ---- ໜ້າລາຄາສົ່ງ (agent.html) ----
  // ດຶງຂໍ້ມູນຈາກ products.json ຊຸດດຽວກັບໜ້າຮ້ານ (ລາຄາສົ່ງເປັນ field ໜຶ່ງໃນສິນຄ້ານັ້ນເລີຍ:
  // wholesalePriceLAK / wholesalePriceTHB) ດັ່ງນັ້ນບໍ່ຕ້ອງມີໄຟລ໌ແຍກຕ່າງຫາກອີກຕໍ່ໄປ
  //
  // ໝາຍເຫດ: ເນື່ອງຈາກໃຊ້ products.json ຮ່ວມກັນ, ຄ່າ wholesalePriceLAK/THB ຈະຢູ່ໃນໄຟລ໌ດຽວກັນກັບ
  // ຂໍ້ມູນທີ່ໜ້າຮ້ານ (index.html) ດຶງໄປໃຊ້ — ຖ້າລູກຄ້າທົ່ວໄປເປີດ DevTools → Network ເບິ່ງ request
  // ຂອງ products.json ຈະສາມາດເຫັນຕົວເລກລາຄາສົ່ງໄດ້ (ເຖິງແມ່ນໜ້າຮ້ານຈະບໍ່ສະແດງມັນອອກມາກໍ່ຕາມ)
  // ອ່ານລາຍລະອຽດຂໍ້ຈຳກັດນີ້ໃນ DEPLOY.md ຂໍ້ 6

  // ລະຫັດຕົວແທນ (Agent Code) ບໍ່ໄດ້ເກັບເປັນຕົວໜັງສືທຳມະດາ (plain text) ໄວ້ໃນນີ້
  // ແຕ່ເກັບເປັນ SHA-256 hash ແທນ — ເພື່ອບໍ່ໃຫ້ຄົນເປີດເບິ່ງ source code (view-source) ແລ້ວເຫັນລະຫັດຕົງໆ
  // ວິທີສ້າງ hash ໃໝ່: ເປີດ agent.html → Console (F12) → hashAgentCode('ລະຫັດຂອງທ່ານ').then(h=>console.log(h))
  // ໝາຍເຫດ: ອັນນີ້ເປັນພຽງອຸປະສັກເບື້ອງຕົ້ນ (obscurity) ບໍ່ແມ່ນຄວາມປອດໄພແທ້ (ອ່ານລາຍລະອຽດຂໍ້ຈຳກັດໃນ DEPLOY.md)
  AGENT_CODE_HASH: '1b3e54e14c235b0c063a4e34ea671367a3b07965b5aeb8d01e59f16533e13b68',
};

/* ---------- URL helpers (ໃຊ້ຮ່ວມກັນລະຫວ່າງ index.html / admin.html) ---------- */

// ອ່ານໄຟລ໌ແບບ public, ໄວ, ບໍ່ຕ້ອງມີ token — ໃຊ້ຢູ່ໜ້າຮ້ານ (read-only)
// ໃສ່ ?t=timestamp ກັນ CDN cache ຂອງ raw.githubusercontent.com (ປົກກະຕິ cache ~5 ນາທີ)
function ghRawUrl(path) {
  return `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/${path}?t=${Date.now()}`;
}

// jsDelivr CDN — ໃຊ້ສະແດງຮູບພາບ (ໄວກວ່າ, CORS ດີກວ່າ, ແຕ່ cache ດົນກວ່າ raw ~ບໍ່ເກີນ 24 ຊມ / purge ໄດ້)
function ghCdnUrl(path) {
  return `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}@${CONFIG.GITHUB_BRANCH}/${path}`;
}

// GitHub Contents API — ໃຊ້ໂດຍ admin.js ເທົ່ານັ້ນ (ຕ້ອງມີ token, ໃຊ້ອ່ານ+ຂຽນ/commit)
function ghApiContentsUrl(path) {
  return `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}`;
}
