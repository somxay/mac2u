/* =========================================================================
   chat.js — AI Assistant Chat Widget (index.html)
   ເອີ້ນຫາ serverless function (api/gemini-chat ຫຼື netlify/functions/gemini-chat)
   ບໍ່ເອີ້ນ Gemini API ໂດຍກົງຈາກ browser ເພື່ອບໍ່ໃຫ້ API Key ຮົ່ວອອກສາທາລະນະ
   ========================================================================= */

let chatHistory = [];       // [{role:'user'|'assistant', text}]
let chatWelcomed = false;

function toggleChatDrawer() {
  const drawer = document.getElementById('aiChatDrawer');
  const isHidden = drawer.classList.contains('hidden');

  if (isHidden) {
    drawer.classList.remove('hidden');
    if (!chatWelcomed) {
      chatWelcomed = true;
      appendChatMessage('assistant',
        `ສະບາຍດີ! 👋 ຂ້ອຍແມ່ນ AI ຜູ້ຊ່ວຍຂອງ ${CONFIG.STORE_NAME}\n\nຖາມຂ້ອຍໄດ້ເລີຍ ເຊັ່ນ:\n• "MacBook M1 ກັບ M2 ຕ່າງກັນແນວໃດ?"\n• "ມີ MacBook ລາຄາຕ່ຳກວ່າ 5 ລ້ານກີບບໍ່?"\n• ຫຼືຖາມກ່ຽວກັບເຄື່ອງ DJ ແລະການລົງໂປຣແກຣມ 😊`);
    }
    setTimeout(() => {
      const input = document.getElementById('chatInput');
      if (input) input.focus();
    }, 250);
  } else {
    drawer.classList.add('hidden');
  }
}

function appendChatMessage(role, text) {
  const box = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = `chat-bubble-msg flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

  const bubbleClass = role === 'user'
    ? 'bg-indigo-600 text-white rounded-br-md'
    : 'bg-white text-slate-700 rounded-bl-md border border-slate-100 shadow-sm';

  el.innerHTML = `<div class="max-w-[85%] ${bubbleClass} px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap">${formatChatText(text)}</div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

// Escape HTML ກ່ອນ ເພື່ອປ້ອງກັນ XSS, ແລ້ວຄ່ອຍແປງ **bold** ແບບງ່າຍໆ (Gemini ມັກຕອບເປັນ markdown ນ້ອຍໆ)
function formatChatText(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function showTypingIndicator() {
  const box = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.id = 'chatTypingIndicator';
  el.className = 'chat-bubble-msg flex justify-start';
  el.innerHTML = `
    <div class="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('chatTypingIndicator');
  if (el) el.remove();
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  const sendBtn = document.getElementById('chatSendBtn');
  input.value = '';
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  appendChatMessage('user', message);
  showTypingIndicator();

  try {
    const res = await fetch(CONFIG.GEMINI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: chatHistory,
        products: (typeof allProducts !== 'undefined') ? allProducts : [],
        storeName: CONFIG.STORE_NAME,
        whatsapp: CONFIG.WHATSAPP_NUMBER
      })
    });

    let data = {};
    try { data = await res.json(); } catch (parseErr) { /* ignore, handled below */ }
    removeTypingIndicator();

    if (!res.ok || !data.reply) {
      appendChatMessage('assistant', data.error || 'ຂໍອະໄພ, ຕອນນີ້ AI Assistant ຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາຕິດຕໍ່ຮ້ານຜ່ານ WhatsApp ແທນ.');
    } else {
      appendChatMessage('assistant', data.reply);
      chatHistory.push({ role: 'user', text: message });
      chatHistory.push({ role: 'assistant', text: data.reply });
      chatHistory = chatHistory.slice(-16); // ຈຳກັດປະຫວັດການສົນທະນາບໍ່ໃຫ້ຍາວເກີນໄປ
    }
  } catch (err) {
    console.error('chat error:', err);
    removeTypingIndicator();
    appendChatMessage('assistant', 'ຂໍອະໄພ, ເຊື່ອມຕໍ່ AI Assistant ບໍ່ໄດ້ຕອນນີ້. ລອງໃໝ່ພາຍຫຼັງ ຫຼືທັກ WhatsApp ຮ້ານໄດ້ເລີຍ.');
  } finally {
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}
