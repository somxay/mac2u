/* =========================================================================
   api/gemini-chat.js — Vercel Serverless Function
   ໜ້າທີ່: ຮັບຂໍ້ຄວາມຈາກ Chat Widget → ຕໍ່ Google Gemini API → ສົ່ງຄຳຕອບກັບ
   GEMINI_API_KEY ຖືກເກັບໄວ້ໃນ Environment Variable ຂອງ Vercel ເທົ່ານັ້ນ
   (Project → Settings → Environment Variables) ບໍ່ເຄີຍຖືກສົ່ງໄປໃຫ້ browser
   ========================================================================= */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ GEMINI_API_KEY ຢູ່ Environment Variable ຂອງ Vercel' });
    return;
  }

  try {
    const { message, history, products, storeName, whatsapp } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'ບໍ່ພົບຂໍ້ຄວາມ (message)' });
      return;
    }

    const reply = await callGemini({ apiKey, message, history, products, storeName, whatsapp });
    res.status(200).json({ reply });
  } catch (err) {
    console.error('gemini-chat error:', err);
    res.status(500).json({ error: err.message || 'ເກີດຂໍ້ຜິດພາດພາຍໃນ server' });
  }
}

/* --------------------------------- Shared logic --------------------------------- */

async function callGemini({ apiKey, message, history, products, storeName, whatsapp }) {
  // ຈຳກັດຂະໜາດ context ບໍ່ໃຫ້ໃຫຍ່ເກີນໄປ (ປ້ອງກັນ token ເກີນ ແລະ ຄ່າໃຊ້ຈ່າຍສູງ)
  const safeProducts = Array.isArray(products) ? products.slice(0, 300) : [];
  const productContext = safeProducts.map(p => ({
    id: p.id,
    title: p.title,
    category: p.category,
    priceLAK: p.priceLAK || undefined,
    priceTHB: p.priceTHB || undefined,
    color: p.color || undefined,
    cpu: p.cpu || undefined,
    ram: p.ram || undefined,
    ssd: p.ssd || undefined,
    year: p.year || undefined,
    screenSize: p.screenSize || undefined,
    battery: p.battery || undefined,
    keyboard: p.keyboard || undefined,
    status: p.status
  }));

  const systemInstruction = buildSystemInstruction(storeName || 'Mac & DJ Store', whatsapp || '22258416', productContext);

  const safeHistory = Array.isArray(history) ? history.slice(-12) : [];
  const contents = [
    ...safeHistory.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(h.text || '').slice(0, 2000) }]
    })),
    { role: 'user', parts: [{ text: message.slice(0, 2000) }] }
  ];

  // ໝາຍເຫດ: gemini-2.5-flash ເປັນ model ຫຼັກທີ່ໝັ້ນຄົງ (stable/GA) ໃນຕອນຂຽນຄູ່ມືນີ້
  // ຖ້າ Google ອອກ model ໃໝ່ ຫຼື deprecate ລຸ້ນນີ້ໃນພາຍຫຼັງ, ປ່ຽນຄ່າໄດ້ຜ່ານ ENV var GEMINI_MODEL
  // ໂດຍບໍ່ຕ້ອງແກ້ໂຄ້ດ (ເບິ່ງລຸ້ນລ່າສຸດໄດ້ທີ່ https://ai.google.dev/gemini-api/docs/models)
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error('Gemini API error:', data);
    throw new Error(data?.error?.message || 'Gemini API ຕອບກັບຂໍ້ຜິດພາດ');
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return text || 'ຂໍອະໄພ, ຕອນນີ້ AI ບໍ່ສາມາດຕອບໄດ້, ລອງໃໝ່ພາຍຫຼັງ ຫຼືທັກ WhatsApp ຮ້ານໄດ້ເລີຍ.';
}

function buildSystemInstruction(storeName, whatsapp, products) {
  return `ທ່ານແມ່ນ AI Assistant (ຜູ້ຊ່ວຍອັດສະລິຍະ) ປະຈຳຮ້ານ "${storeName}" ຮ້ານຂາຍ MacBook ມືສອງ, ອຸປະກອນ DJ, ອຸປະກອນເສີມ ແລະ ບໍລິການລົງໂປຣແກຣມ.

ໜ້າທີ່ຂອງທ່ານ:
- ຕອບຄຳຖາມລູກຄ້າກ່ຽວກັບສິນຄ້າໃນຮ້ານ, ຊ່ວຍປຽບທຽບສະເປັກ (RAM, SSD, ຊິບ M1/M2/M3, ຄວາມແຮງ, ລາຄາ) ແລະໃຫ້ຄຳປຶກສາເບື້ອງຕົ້ນກ່ຽວກັບ MacBook, ອຸປະກອນ DJ, ແລະການລົງໂປຣແກຣມ
- ຕອບເປັນມິດ, ສຸພາບ, ກະທັດຮັດ (ບໍ່ຍາວເກີນໄປ), ໃຊ້ພາສາດຽວກັນກັບທີ່ລູກຄ້າພິມມາ (ລາວ, ໄທ, ຫຼື ອັງກິດ)

ກົດເຫຼັກທີ່ຕ້ອງປະຕິບັດຕາມຢ່າງເຄັ່ງຄັດ:
1. ທ່ານຕ້ອງແນະນຳ ຫຼື ປຽບທຽບ ສະເພາະສິນຄ້າທີ່ມີຢູ່ໃນລາຍການ "ລາຍການສິນຄ້າປັດຈຸບັນ" ຂ້າງລຸ່ມນີ້ເທົ່ານັ້ນ
2. ຫ້າມແນະນຳ ຫຼື ກ່າວເຖິງສິນຄ້າ/ລຸ້ນ/ຮຸ່ນອື່ນທີ່ບໍ່ມີຢູ່ໃນລາຍການນີ້ໂດຍເດັດຂາດ (ເຖິງແມ່ນວ່າຈະເປັນສິນຄ້າທີ່ມີຂາຍທົ່ວໄປໃນທ້ອງຕະຫຼາດກໍ່ຕາມ)
3. ຖ້າລູກຄ້າຖາມຫາສິນຄ້າ ຫຼື ຄຸນສົມບັດທີ່ບໍ່ມີໃນຮ້ານ, ໃຫ້ບອກຢ່າງສຸພາບວ່າຕອນນີ້ຮ້ານບໍ່ມີສິນຄ້ານັ້ນ ແລ້ວແນະນຳສິນຄ້າທີ່ໃກ້ຄຽງທີ່ສຸດຈາກລາຍການທີ່ມີແທນ (ຖ້າມີ)
4. ອ້າງອີງລາຄາ, ສະເປັກ ຈາກຂໍ້ມູນໃນລາຍການເທົ່ານັ້ນ, ຫ້າມແຕ່ງຕົວເລກຫຼືສະເປັກຂຶ້ນເອງ
5. ຫ້າມແຕ່ງ/ຄາດເດົາຂໍ້ມູນສ່ວນຕົວຂອງລູກຄ້າ ຫຼືສັນຍາເລື່ອງການຮັບປະກັນ/ນະໂຍບາຍທີ່ບໍ່ໄດ້ໃຫ້ໄວ້
6. ຖ້າລູກຄ້າຢາກສັ່ງຊື້ ຫຼືຢາກລົມກັບຄົນຈິງ, ໃຫ້ແນະນຳໃຫ້ທັກ WhatsApp ຂອງຮ້ານທີ່ເບີ ${whatsapp}
7. status ຂອງສິນຄ້າ: "Ready"=ພ້ອມຂາຍ, "Reserved"=ຈອງແລ້ວ, "Sold"=ຂາຍແລ້ວ — ຢ່າແນະນຳສິນຄ້າທີ່ Sold ແລ້ວວ່າຍັງຊື້ໄດ້

ລາຍການສິນຄ້າປັດຈຸບັນ (JSON, ລາຄາເປັນ ກີບ/ບາດ):
${JSON.stringify(products)}`;
}
