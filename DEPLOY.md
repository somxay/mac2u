# ຄູ່ມືການ Deploy — Mac & DJ Store (Static Site + GitHub Data)

## ພາບລວມສະຖາປັດຕະຍະກຳໃໝ່

```
Browser (ໜ້າຮ້ານ index.html)
   │  fetch (GET, ບໍ່ຕ້ອງ token)
   ▼
raw.githubusercontent.com/OWNER/REPO/main/data/products.json
raw.githubusercontent.com/OWNER/REPO/main/data/settings.json

Browser (ຫຼັງບ້ານ admin.html)
   │  GitHub Contents API (GET + PUT, ໃຊ້ Personal Access Token)
   ▼
api.github.com/repos/OWNER/REPO/contents/...
   │ (ທຸກການບັນທຶກ = 1 Git commit ໃໝ່ໃນ repo)
   ▼
GitHub Repository (data/products.json, data/settings.json, images/*)
```

ບໍ່ມີ backend server ອີກຕໍ່ໄປ — ໜ້າຮ້ານອ່ານໄຟລ໌ JSON ຈາກ GitHub ໂດຍກົງ, ແລະ ຫຼັງບ້ານຂຽນ/commit ໄຟລ໌ນັ້ນກັບຄືນ GitHub ໂດຍກົງຈາກ browser ຂອງແອດມິນ.

---

## ຂັ້ນຕອນທີ 1: ສ້າງ GitHub Repository ສຳລັບຂໍ້ມູນ

1. ເຂົ້າ https://github.com/new
2. ຕັ້ງຊື່ repo ເຊັ່ນ `macdjstore-site` — ເລືອກ **Public** (raw.githubusercontent.com ອ່ານໄດ້ຟຣີສະເພາະ repo public; ຖ້າຢາກໃຊ້ private repo ຕ້ອງມີ backend proxy ເພີ່ມ, ບໍ່ໄດ້ອະທິບາຍໃນຄູ່ມືນີ້)
3. ອັບໂຫຼດໄຟລ໌ທັງໝົດທີ່ໃຫ້ໄວ້:
   - `index.html`
   - `app.js`
   - `admin.html`
   - `admin.js`
   - `config.js`
   - `data/products.json`
   - `data/settings.json`
   - ໂຟນເດີ `images/` (ໃສ່ໄຟລ໌ `.gitkeep` ຫວ່າງໆໄວ້ກ່ອນກໍໄດ້ ເພື່ອໃຫ້ folder ຖືກສ້າງ)

   ອັບໂຫຼດງ່າຍໆຜ່ານໜ້າເວັບ GitHub (ລາກໄຟລ໌ວາງ) ຫຼືຜ່ານ `git push` ຖ້າຄຸ້ນເຄີຍ.

4. **ສຳຄັນ:** ເປີດ `config.js` ແກ້ 3 ຄ່ານີ້ໃຫ້ກົງກັບ repo ຂອງທ່ານ:
   ```js
   GITHUB_OWNER: 'ຊື່ github ຂອງທ່ານ',
   GITHUB_REPO: 'ຊື່ repo ຂອງທ່ານ',
   GITHUB_BRANCH: 'main',
   ```
   ຄ່ານີ້ໃຊ້ຮ່ວມກັນທັງ `index.html` ແລະ `admin.html` — ແກ້ບ່ອນດຽວ.

5. ໃນຮູບ `data/products.json` ຕົວຢ່າງທີ່ໃຫ້ໄວ້, ໃຫ້ແກ້ URL ຮູບພາບ (ຫຼືລຶບສິນຄ້າຕົວຢ່າງອອກ) — ຮູບພາບຈິງຈະຖືກເພີ່ມຜ່ານໜ້າ Admin ພາຍຫຼັງ.

---

## ຂັ້ນຕອນທີ 2: ສ້າງ GitHub Personal Access Token (PAT) ສຳລັບແອດມິນ

ອັນນີ້ຄືກະແຈທີ່ໃຊ້ແທນ "ລະຫັດຜ່ານຫຼັງບ້ານ" ແບບເກົ່າ — ຄົນທີ່ຖື token ນີ້ຈະສາມາດແກ້ໄຂ/commit ຂໍ້ມູນ repo ໄດ້.

### ແນະນຳ: Fine-grained Personal Access Token (ປອດໄພກວ່າ)
1. ໄປ https://github.com/settings/personal-access-tokens/new
2. **Repository access** → ເລືອກ "Only select repositories" → ເລືອກ repo ຂໍ້ມູນຂອງທ່ານ (ຂໍ້ 1)
3. **Permissions** → **Repository permissions** → **Contents** → ຕັ້ງເປັນ **Read and write**
4. ຕັ້ງວັນໝົດອາຍຸ (Expiration) ຕາມທີ່ຕ້ອງການ (ແນະນຳ 90 ວັນ ແລ້ວສ້າງໃໝ່, ເພື່ອຄວາມປອດໄພ)
5. ກົດ **Generate token** → ຄັດລອກ token (ຂຶ້ນຕົ້ນດ້ວຍ `github_pat_...`) — ຈະເຫັນຄັ້ງດຽວເທົ່ານັ້ນ

### ຫຼືແບບເກົ່າ: Classic Token
1. ໄປ https://github.com/settings/tokens/new
2. ເລືອກ scope `repo` (ໃຫ້ສິດອ່ານ/ຂຽນ repo)
3. Generate → ຄັດລອກ token (ຂຶ້ນຕົ້ນດ້ວຍ `ghp_...`)

**ຄຳເຕືອນດ້ານຄວາມປອດໄພ (ສຳຄັນຫຼາຍ):**
- Token ນີ້ຈະຖືກໃສ່ໃນໜ້າ `admin.html` ຈາກ browser ຂອງແອດມິນເອງ ແລະ ຖືກເກັບໄວ້ໃນ `sessionStorage`/`localStorage` ຂອງ browser ນັ້ນ (ບໍ່ໄດ້ຖືກສົ່ງໄປເຊີບເວີໃດໆນອກຈາກ GitHub)
- ຢ່າແບ່ງປັນ token ນີ້ ຫຼື commit ມັນລົງ code ໂດຍກົງ
- ຖ້າສົງໄສວ່າ token ຫຼຸດ, ໃຫ້ໄປ revoke ຢູ່ໜ້າ settings ດຽວກັນທັນທີ ແລ້ວສ້າງອັນໃໝ່
- ເນື່ອງຈາກນີ້ເປັນ static site ລ້ວນໆ (ບໍ່ມີ server) token ຈະຢູ່ໃນ browser ຂອງຄົນທີ່ login ເທົ່ານັ້ນ — ຄົນທົ່ວໄປທີ່ເຂົ້າ `admin.html` ໂດຍບໍ່ມີ token ຈະບໍ່ສາມາດແກ້ໄຂຫຍັງໄດ້ ເພາະ GitHub ຈະປະຕິເສດ request ທີ່ບໍ່ມີ token ຖືກຕ້ອງ
- ຂໍ້ມູນສິນຄ້າໃນ `data/products.json` ເປັນ public (ໃຜກໍ່ອ່ານໄດ້ຜ່ານ raw URL) — ນີ້ແມ່ນເລື່ອງປົກກະຕິສຳລັບເວັບຂາຍເຄື່ອງ, ແຕ່ຢ່າໃສ່ຂໍ້ມູນລັບ (ເຊັ່ນ ເບີໂທລູກຄ້າ) ລົງໃນໄຟລ໌ນີ້

---

## ຂັ້ນຕອນທີ 3: Deploy ຂຶ້ນ Vercel (ແນະນຳ, ໄວ ແລະ ຟຣີ)

1. ສະໝັກ/login https://vercel.com ດ້ວຍບັນຊີ GitHub ດຽວກັນ
2. ກົດ **Add New → Project**
3. ເລືອກ repository ຂໍ້ມູນ/ໜ້າເວັບຂອງທ່ານ (repo ດຽວກັບຂໍ້ 1 ໄດ້ ຫຼືແຍກ repo ສຳລັບໂຄ້ດເວັບກໍ່ໄດ້ — ຖ້າແຍກ ໃຫ້ແກ້ `config.js` ໃຫ້ຊີ້ຄືນ repo ຂໍ້ມູນ)
4. **Framework Preset** → ເລືອກ **Other** (ບໍ່ຕ້ອງ build command ໃດໆ, ເປັນ static HTML ລ້ວນໆ)
5. **Output Directory** → ປ່ອຍວ່າງ ຫຼື `.` (root)
6. ກົດ **Deploy** — ໃນ ~30 ວິນາທີ ຈະໄດ້ URL ແບບ `https://your-project.vercel.app`
7. ທົດລອງເປີດ `https://your-project.vercel.app/index.html` ແລະ `.../admin.html`

---

## ຂັ້ນຕອນທາງເລືອກ: Deploy ຂຶ້ນ Netlify

1. ສະໝັກ/login https://netlify.com ດ້ວຍບັນຊີ GitHub
2. **Add new site → Import an existing project**
3. ເລືອກ repo → Build command ປ່ອຍວ່າງ, Publish directory: `.`
4. Deploy — ໄດ້ URL ແບບ `https://your-site.netlify.app`

---

## ຂັ້ນຕອນທາງເລືອກ: Deploy ຂຶ້ນ GitHub Pages

1. ໃນ repo ດຽວກັນ (ຫຼື repo ແຍກສະເພາະໜ້າເວັບ) → **Settings → Pages**
2. **Source** → Deploy from a branch → ເລືອກ `main` / root
3. ຫຼັງບັນທຶກ ~1-2 ນາທີ ຈະໄດ້ URL ແບບ `https://OWNER.github.io/REPO/`

---

## ຂັ້ນຕອນທີ 4: ຜູກ Custom Domain (ພາຍຫຼັງຊື້ .com / .la)

ເນື່ອງຈາກໂຄ້ດບໍ່ໄດ້ hardcode domain ໃດໄວ້ (ໃຊ້ relative path `admin.html`, `index.html`, `config.js`, `app.js` ທັງໝົດ), ການຜູກ domain ໃໝ່ບໍ່ຕ້ອງແກ້ໂຄ້ດຫຍັງເລີຍ:

**Vercel:** Project → Settings → Domains → ໃສ່ domain ຂອງທ່ານ → ຕັ້ງ DNS ຕາມທີ່ Vercel ບອກ (A record ຫຼື CNAME)
**Netlify:** Site settings → Domain management → Add custom domain → ຕັ້ງ DNS ຕາມທີ່ Netlify ບອກ
**GitHub Pages:** Settings → Pages → Custom domain → ໃສ່ domain → ຕັ້ງ CNAME record ຊີ້ໄປ `OWNER.github.io`

ບໍ່ວ່າຈະຜູກ domain ໃດ, `data/products.json` ຍັງຄົງເກັບຢູ່ GitHub repo ເໝືອນເດີມ — ໜ້າເວັບຈະ fetch ຈາກ GitHub ຢູ່ສະເໝີ ບໍ່ວ່າ domain ໜ້າຮ້ານຈະປ່ຽນເປັນຫຍັງກໍ່ຕາມ.

---

## ວິທີໃຊ້ງານປະຈຳວັນ

- **ອັບເດດສິນຄ້າ:** ເປີດ `yourdomain.com/admin.html` → ໃສ່ GitHub Token → ເພີ່ມ/ແກ້ໄຂ/ລຶບສິນຄ້າ → ລະບົບຈະ commit ລົງ `data/products.json` ໂດຍອັດຕະໂນມັດ
- **ອັບໂຫຼດຮູບ:** ໃນຟອມເພີ່ມ/ແກ້ໄຂສິນຄ້າ ກົດ "ເລືອກຮູບພາບ" → ຮູບຈະຖືກ commit ເຂົ້າ folder `images/` ໃນ repo ແລ້ວດຶງ URL ຜ່ານ jsDelivr CDN ໃຫ້ອັດຕະໂນມັດ (ໂຫຼດໄວ ແລະ ບໍ່ຕິດບັນຫາ CORS)
- **ອັບເດດອັດຕາແລກປ່ຽນ:** ໃນໜ້າ Admin ມີຫ້ອງແກ້ອັດຕາ ກີບ↔ບາດ ຄືເກົ່າ
- **ກວດປະກັນ:** ໜ້າຮ້ານຄິດໄລ່ຈາກ `soldDate` (ວັນທີ່ປ່ຽນສະຖານະເປັນ "ຂາຍແລ້ວ" ຄັ້ງທຳອິດ, ບັນທຶກອັດຕະໂນມັດ) + `warrantyDays` ທີ່ຕັ້ງໄວ້ ໂດຍບໍ່ຕ້ອງມີ server ຄິດໄລ່

## ໝາຍເຫດເລື່ອງ Cache

- `raw.githubusercontent.com` cache ປະມານ 5 ນາທີ — ໜ້າຮ້ານໃສ່ `?t=timestamp` ໃນທຸກ request ຢູ່ແລ້ວເພື່ອຫຼີກລ້ຽງບັນຫານີ້
- ຮູບພາບຜ່ານ jsDelivr ອາດ cache ດົນກວ່າ (ຫຼາຍຊົ່ວໂມງ) ແຕ່ນີ້ບໍ່ມີບັນຫາເພາະຊື່ໄຟລ໌ຮູບໃໝ່ທຸກຄັ້ງທີ່ອັບໂຫຼດ (ໃຊ້ timestamp ໃນຊື່ໄຟລ໌)

## ຂໍ້ຈຳກັດທີ່ຄວນຮູ້

- ນີ້ບໍ່ແມ່ນ e-commerce database ແທ້ (ບໍ່ມີ transaction lock) — ຖ້າ 2 ຄົນແກ້ໄຂພ້ອມກັນອາດຂຽນທັບກັນ (last-write-wins) ເໝາະສຳລັບຮ້ານຂະໜາດນ້ອຍ-ກາງທີ່ມີແອດມິນຄົນດຽວ ຫຼືສອງສາມຄົນ
- ຮູບພາບຄວນຫຍໍ້ຂະໜາດກ່ອນອັບໂຫຼດ (ແນະນຳ < 1-2MB/ຮູບ) ເພາະ commit ຜ່ານ API ຈະຊ້າຖ້າໄຟລ໌ໃຫຍ່ເກີນໄປ

---

## ຂັ້ນຕອນທີ 6: ຕັ້ງຄ່າໜ້າລາຄາສົ່ງ (agent.html)

ໜ້າ `agent.html` ເປັນໜ້າສະແດງລາຄາສົ່ງສະເພາະຕົວແທນ, ຖືກກັນຈາກ Google (`noindex, nofollow`) ແລະ ຕ້ອງໃສ່ລະຫັດຕົວແທນກ່ອນຈຶ່ງຈະເບິ່ງໄດ້.

### 6.1 ໄຟລ໌ທີ່ກ່ຽວຂ້ອງ
- `agent.html` + `agent.js` — ໜ້າ ແລະ logic ຂອງໜ້າລາຄາສົ່ງ
- `agent_products.json` — ຂໍ້ມູນລາຄາສົ່ງ (ຄົນລະໄຟລ໌ກັບ `products.json` ຂອງໜ້າຮ້ານປົກກະຕິ)
- `config.js` — ມີ `AGENT_PRODUCTS_PATH` ແລະ `AGENT_CODE_HASH`
- ໃນ `index.html` ມີຈຸດເຂົ້າເຖິງແບບລັບ: ຈຸດ "·" ຈາງໆຫຼັງຄຳວ່າ "© 2026 Mac & DJ Store" ຢູ່ລຸ່ມສຸດຂອງໜ້າ (ກົດເຂົ້າ `agent.html`)
- ໃນ `admin.html` ມີປຸ່ມ "ລາຄາສົ່ງ" ຢູ່ໜ້າຫຼັງບ້ານ ໃຫ້ແອດມິນຈັດການລາຄາສົ່ງໄດ້ໂດຍກົງ (ອ່ານຂໍ້ 6.3)

### 6.2 ຕັ້ງລະຫັດຕົວແທນ (Agent Code)

ລະຫັດຕົວແທນຖືກເກັບເປັນ **SHA-256 hash** ໃນ `config.js` (ບໍ່ແມ່ນຄຳທຳມະດາ) ເພື່ອບໍ່ໃຫ້ຄົນອື່ນເປີດ view-source ແລ້ວເຫັນລະຫັດຕົງໆ. ວິທີສ້າງ hash ຈາກລະຫັດທີ່ທ່ານຢາກໃຊ້:

1. ເປີດ `agent.html` ຢູ່ browser ຂອງທ່ານ (ຫຼືໜ້າໃດກໍ່ໄດ້ໃນເວັບໄຊທ໌)
2. ກົດ F12 ເປີດ Console
3. ພິມຄຳສັ່ງນີ້ ແລ້ວປ່ຽນ `'ລະຫັດຂອງທ່ານ'` ເປັນລະຫັດຈິງທີ່ຢາກໃຊ້:
   ```js
   hashAgentCode('ລະຫັດຂອງທ່ານ').then(h => console.log(h));
   ```
4. ຄັດລອກຄ່າ hash ທີ່ໄດ້ (ຕົວອັກສອນ-ຕົວເລກຍາວໆ) → ເອົາໄປແທນຄ່າ `AGENT_CODE_HASH` ໃນ `config.js`
5. Commit `config.js` ຂຶ້ນ GitHub

**ຄຳເຕືອນສຳຄັນກ່ຽວກັບຄວາມປອດໄພ:** ເນື່ອງຈາກນີ້ເປັນ static site ລ້ວນໆ (ບໍ່ມີ server ກວດລະຫັດ), ນີ້ເປັນພຽງ "ອຸປະສັກເບື້ອງຕົ້ນ" ບໍ່ແມ່ນກຳແພງຄວາມປອດໄພແທ້ຈິງ:
- ຄົນທີ່ຮູ້ວິທີເທັກນິກ (ເປີດ Network tab, ອ່ານ `agent.js`) ຈະຮູ້ວ່າຂໍ້ມູນຢູ່ໄຟລ໌ `agent_products.json` ແລະ ຖ້າ repo ເປັນ public ພວກເຂົາຈະເປີດອ່ານໄຟລ໌ນັ້ນໂດຍກົງໄດ້ຢູ່ດີ (ຜ່ານ raw.githubusercontent.com) ໂດຍບໍ່ຕ້ອງຜ່ານລະຫັດເລີຍ
- ຖ້າຕ້ອງການຄວາມປອດໄພແທ້ຈິງ (ຫ້າມເບິ່ງໄຟລ໌ໂດຍກົງເດັດຂາດ), ຕ້ອງໃຊ້ repo ແບບ **private** ບວກກັບ serverless function ເປັນ proxy ກວດ session ກ່ອນສົ່ງຂໍ້ມູນກັບ — ນອກເໜືອຈາກຂອບເຂດຂອງ static site ນີ້
- ວິທີນີ້ເໝາະສຳລັບ "ກັນລູກຄ້າທົ່ວໄປສະດວກໆ ບໍ່ໃຫ້ເຫັນລາຄາສົ່ງໂດຍບັງເອີນ" ບໍ່ແມ່ນປ້ອງກັນຄົນທີ່ຕັ້ງໃຈຫາຊ່ອງໂຫວ່

### 6.3 ການຈັດການລາຄາສົ່ງໃນໜ້າ Admin

ຫຼັງເຂົ້າ `admin.html` ດ້ວຍ GitHub Token ຄືເກົ່າ, ຈະມີປຸ່ມ **"ລາຄາສົ່ງ"** (ສີເຫຼືອງ) ຢູ່ຂ້າງປຸ່ມ "ເພີ່ມສິນຄ້າ":

1. ກົດປຸ່ມ "ລາຄາສົ່ງ" → ຈະເປີດ popup ຈັດການ
2. ເລືອກສິນຄ້າຈາກ dropdown (ດຶງມາຈາກລາຍການສິນຄ້າປົກກະຕິ) → ກົດ "+ ເພີ່ມ" ເພື່ອເອົາເຂົ້າລາຍການລາຄາສົ່ງ
3. ໃສ່ລາຄາສົ່ງ (ກີບ) ຕໍ່ລາຍການ
4. ກົດ "ບັນທຶກລາຄາສົ່ງທັງໝົດ" → commit ຂຶ້ນ `agent_products.json` ໂດຍກົງ (ຄືກັນກັບບັນທຶກສິນຄ້າປົກກະຕິ)

ຂໍ້ມູນນີ້ບໍ່ໄດ້ຖືກ mix ເຂົ້າກັບ `products.json` ຂອງໜ້າຮ້ານ — ໜ້າຮ້ານ (`index.html`/`app.js`) ບໍ່ເຄີຍ fetch ໄຟລ໌ `agent_products.json` ເລີຍ, ດັ່ງນັ້ນລູກຄ້າທົ່ວໄປທີ່ເປີດ Network tab ຢູ່ໜ້າຮ້ານປົກກະຕິ ຈະບໍ່ເຫັນ request ໄປຫາໄຟລ໌ນີ້.

### 6.4 ຈຸດເຂົ້າເຖິງແບບລັບ
ຈຸດ "·" ຈາງໆຢູ່ footer ຂອງ `index.html` ແມ່ນລິ້ງໄປ `agent.html` — ຖ້າຢາກປ່ຽນຕຳແໜ່ງ/ຮູບແບບ (ເຊັ່ນ ຍ້າຍໄປ logo, ຫຼືປ່ຽນເປັນ 5-click ເທິງໂລໂກ້) ແກ້ໄດ້ໃນ `index.html` ບ່ອນ `<footer>` ຢູ່ທ້າຍໄຟລ໌

