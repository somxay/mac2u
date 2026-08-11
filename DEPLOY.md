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

## ຂັ້ນຕອນທີ 6: ໜ້າລາຄາສົ່ງ (agent.html) — ຮຸ່ນລວມເຂົ້າ products.json

**ໂຄງສ້າງໃໝ່:** ລາຄາສົ່ງບໍ່ໄດ້ເກັບແຍກໄຟລ໌ (`agent_products.json`) ອີກຕໍ່ໄປ — ຕອນນີ້ເປັນ field ທຳມະດາຢູ່ໃນສິນຄ້າແຕ່ລະລາຍການໃນ `products.json` ເລີຍ ເພື່ອໃຫ້ແອດມິນເບິ່ງ/ແກ້ໄຂລາຄາຂາຍ ແລະ ລາຄາສົ່ງພ້ອມກັນຢູ່ໜ້າດຽວ:

```json
{
  "id": "102938",
  "title": "MacBook Air M1 2020",
  "priceLAK": 4500000,
  "wholesalePriceLAK": 4100000,
  "priceTHB": 0,
  "wholesalePriceTHB": 0,
  "colorStock": {
    "Space Gray": 30,
    "Silver": 20
  },
  "...": "field ອື່ນໆຄືເກົ່າ (ram, ssd, cpu, category ฯลฯ)"
}
```

- `wholesalePriceLAK` / `wholesalePriceTHB` — ລາຄາສົ່ງ, ໃສ່ຜ່ານຟອມແກ້ໄຂສິນຄ້າໃນ Admin (ຊ່ອງສີເຫຼືອງ ຢູ່ຂ້າງລາຄາຂາຍປົກກະຕິ)
- `colorStock` — object ບໍ່ບັງຄັບ `{ "ຊື່ສີ": ຈຳນວນ }` ສຳລັບສິນຄ້າທີ່ມີຫຼາຍສີ/ຫຼາຍສະຕັອກ (ເຊັ່ນ ອຸປະກອນເສີມ, ສິນຄ້າໃໝ່ຫຼາຍເຄື່ອງ). ຖ້າສິນຄ້າເປັນເຄື່ອງມືສອງແບບ 1 ID = 1 ເຄື່ອງ, ບໍ່ຈຳເປັນຕ້ອງໃສ່ (ໃຊ້ field `color`/`status` ແບບເກົ່າພໍ)

**ບໍ່ຕ້ອງແກ້ໄຂ `products.json` ດ້ວຍມື** — ໃຊ້ຟອມ Admin ຕາມປົກກະຕິ, ລະບົບຈະບັນທຶກ field ໃໝ່ນີ້ໃຫ້ອັດຕະໂນມັດ.

### 6.1 ຄວາມສ່ຽງດ້ານຄວາມເປັນສ່ວນຕົວທີ່ຕ້ອງຮູ້ (ສຳຄັນ)
ເນື່ອງຈາກ `wholesalePriceLAK`/`wholesalePriceTHB` ຢູ່ໃນໄຟລ໌ `products.json` ຊຸດດຽວກັບທີ່ໜ້າຮ້ານ (`index.html`/`app.js`) fetch ໄປໃຊ້:
- ໜ້າຮ້ານ**ບໍ່ໄດ້ສະແດງ**ຕົວເລກລາຄາສົ່ງອອກມາເລີຍ (ບໍ່ມີບ່ອນໃດໃນ `app.js` ອ້າງອີງ field ນີ້)
- ແຕ່ຖ້າລູກຄ້າທົ່ວໄປເປີດ browser DevTools → tab Network → ເບິ່ງ response ຂອງ request `products.json` ໂດຍກົງ, ພວກເຂົາ**ຈະສາມາດເຫັນຕົວເລກ `wholesalePriceLAK` ໄດ້** ເພາະມັນຢູ່ໃນໄຟລ໌ດຽວກັນ
- ຖ້າຄວາມລັບຂອງລາຄາສົ່ງສຳຄັນຫຼາຍ (ຢ້ານລູກຄ້າເຫັນ), ທາງເລືອກຄື: ກັບໄປໃຊ້ໄຟລ໌ແຍກຕ່າງຫາກແບບເກົ່າ (ບອກຂ້ອຍໄດ້ຖ້າຢາກປ່ຽນກັບຄືນ) — ແຕ່ໂຄງສ້າງໃໝ່ນີ້ແມ່ນເລືອກຄວາມສະດວກໃນການຈັດການແທນ

### 6.2 ຕັ້ງລະຫັດຕົວແທນ (Agent Code)

ລະຫັດຕົວແທນຖືກເກັບເປັນ **SHA-256 hash** ໃນ `config.js` (ບໍ່ແມ່ນຄຳທຳມະດາ). ວິທີສ້າງ hash ໃໝ່:

1. ເປີດ `agent.html` → ກົດ F12 ເປີດ Console
2. ພິມ: `hashAgentCode('ລະຫັດຂອງທ່ານ').then(h => console.log(h));`
3. ຄັດລອກຄ່າ hash ທີ່ໄດ້ → ແທນຄ່າ `AGENT_CODE_HASH` ໃນ `config.js` → commit ຂຶ້ນ GitHub

**ຄຳເຕືອນ:** ນີ້ເປັນ static site, ການກວດລະຫັດເກີດຂຶ້ນຝັ່ງ browser (client-side) — ເປັນພຽງອຸປະສັກເບື້ອງຕົ້ນ ບໍ່ແມ່ນກຳແພງຄວາມປອດໄພແທ້. ຄົນທີ່ຮູ້ວິທີເທັກນິກຍັງເປີດ `products.json` ຜ່ານ raw.githubusercontent.com ໂດຍກົງໄດ້ຢູ່ດີ ຖ້າ repo ເປັນ public.

### 6.3 ໜ້າຕາໜ້າ agent.html
ປັບເປັນລາຍການແບບລຽບງ່າຍ (list, ບໍ່ແມ່ນ card grid) — ແຕ່ລະແຖວສະແດງ: ຊື່ສິນຄ້າ, ID, ໝວດໝູ່, ສະເປັກຄົບຖ້ວນ (CPU/RAM/SSD/ປີ/ຈໍ/ແບັດ/ຄີບອດ), ລາຄາສົ່ງ + ລາຄາຂາຍປົກກະຕິປຽບທຽບ, ແລະ ຖ້າມີ `colorStock` ຈະສະແດງ badge ຈຳນວນຄົງເຫຼືອແຍກຕາມສີ (ຫຼື "ໝົດ" ຖ້າ 0)

### 6.4 ຈຸດເຂົ້າເຖິງແບບລັບ
ຈຸດ "·" ຈາງໆຢູ່ footer ຂອງ `index.html` ຍັງເປັນລິ້ງໄປ `agent.html` ຄືເກົ່າ

### 6.5 ໄຟລ໌ເກົ່າທີ່ບໍ່ໃຊ້ອີກຕໍ່ໄປ
ຖ້າມີໄຟລ໌ `agent_products.json` ຢູ່ໃນ repo ຈາກຮຸ່ນເກົ່າ, ລຶບອອກໄດ້ (ບໍ່ໄດ້ໃຊ້ອີກຕໍ່ໄປ, ບໍ່ມີໂຄ້ດໃດອ້າງອີງເຖິງມັນແລ້ວ)
