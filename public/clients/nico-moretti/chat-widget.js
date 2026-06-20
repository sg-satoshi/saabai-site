(function() {
  'use strict';

  // ─── CONFIG ──────────────────────────────────────────
  var CONFIG = {
    name: 'Sofia',
    subtitle: 'Personal Booking Consultant',
    avatar: 'https://www.saabai.ai/clients/nico-moretti/sofia-avatar.png',
    primaryColor: '#d4af37',
    accentColor: '#0F1B2E',
    bgColor: '#FAF8F5',
    textColor: '#1A1A1A',
    apiEndpoint: 'https://www.saabai.ai/api/nico-chat',
    greeting: "Hello. I'm Sofia, Nico's personal booking consultant. I'm here to help you find the perfect experience, whether it's an evening at the gala, a private dinner, or a weekend away. How may I assist you?",
    placeholder: 'Ask me anything...',
    branding: 'Nico Moretti'
  };

  // ─── STATE ───────────────────────────────────────────
  var isOpen = false;
  var messages = [];
  var isLoading = false;
  var STORAGE_KEY = 'nico-chat-history';

  // ─── CREATE WIDGET DOM ──────────────────────────────
  var container = document.createElement('div');
  container.id = 'nm-chat-widget';
  container.innerHTML =
    '<style id="nm-chat-styles">' +
      '#nm-chat-widget * { box-sizing: border-box; }' +
      '#nm-chat-widget button, #nm-chat-widget input { font-family: inherit; }' +
      '.nm-fab {' +
        'position: fixed; bottom: 24px; right: 24px; z-index: 99999;' +
        'width: 60px; height: 60px; border-radius: 50%; border: none;' +
        'cursor: pointer; padding: 0; overflow: hidden;' +
        'box-shadow: 0 4px 20px rgba(0,0,0,0.3);' +
        'transition: transform 0.2s ease, box-shadow 0.2s ease;' +
      '}' +
      '.nm-fab:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(0,0,0,0.4); }' +
      '.nm-fab img { width: 100%; height: 100%; object-fit: cover; border: 2px solid ' + CONFIG.primaryColor + '; border-radius: 50%; }' +
      '.nm-fab-badge {' +
        'position: absolute; top: -2px; right: -2px;' +
        'background: ' + CONFIG.primaryColor + '; color: ' + CONFIG.accentColor + ';' +
        'width: 20px; height: 20px; border-radius: 50%;' +
        'font-size: 10px; font-weight: 700; display: flex;' +
        'align-items: center; justify-content: center;' +
        'border: 2px solid #fff;' +
      '}' +
      '.nm-window {' +
        'position: fixed; bottom: 96px; right: 24px; z-index: 99998;' +
        'width: 380px; height: 540px; border-radius: 16px; overflow: hidden;' +
        'display: none; flex-direction: column;' +
        'box-shadow: 0 16px 48px rgba(0,0,0,0.25);' +
        'background: ' + CONFIG.bgColor + ';' +
        'animation: nmSlideUp 0.3s ease;' +
      '}' +
      '@keyframes nmSlideUp {' +
        'from { opacity: 0; transform: translateY(20px); }' +
        'to { opacity: 1; transform: translateY(0); }' +
      '}' +
      '.nm-header {' +
        'background: ' + CONFIG.accentColor + '; color: #fff;' +
        'padding: 16px 20px; display: flex; align-items: center; gap: 12px;' +
        'flex-shrink: 0;' +
      '}' +
      '.nm-header-avatar {' +
        'width: 40px; height: 40px; border-radius: 50%; overflow: hidden;' +
        'border: 2px solid ' + CONFIG.primaryColor + '; flex-shrink: 0;' +
      '}' +
      '.nm-header-avatar img { width: 100%; height: 100%; object-fit: cover; }' +
      '.nm-header-info { flex: 1; }' +
      '.nm-header-info strong { font-size: 14px; display: block; }' +
      '.nm-header-info span { font-size: 11px; opacity: 0.8; display: block; margin-top: 2px; }' +
      '.nm-close-btn {' +
        'width: 32px; height: 32px; border: none; background: rgba(255,255,255,0.1);' +
        'border-radius: 50%; cursor: pointer; color: #fff; font-size: 18px;' +
        'display: flex; align-items: center; justify-content: center;' +
        'transition: background 0.2s; flex-shrink: 0;' +
      '}' +
      '.nm-close-btn:hover { background: rgba(255,255,255,0.2); }' +
      '.nm-messages {' +
        'flex: 1; overflow-y: auto; padding: 16px 20px;' +
        'display: flex; flex-direction: column; gap: 12px;' +
        'scroll-behavior: smooth;' +
      '}' +
      '.nm-msg {' +
        'display: flex; gap: 8px; max-width: 85%;' +
        'animation: nmFadeIn 0.2s ease;' +
      '}' +
      '@keyframes nmFadeIn { from { opacity: 0; } to { opacity: 1; } }' +
      '.nm-msg.bot { align-self: flex-start; }' +
      '.nm-msg.user { align-self: flex-end; flex-direction: row-reverse; }' +
      '.nm-msg-avatar {' +
        'width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0;' +
        'border: 1px solid ' + CONFIG.primaryColor + ';' +
      '}' +
      '.nm-msg-avatar img { width: 100%; height: 100%; object-fit: cover; }' +
      '.nm-msg.user .nm-msg-avatar { display: none; }' +
      '.nm-msg-bubble {' +
        'padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5;' +
        'word-wrap: break-word;' +
      '}' +
      '.nm-msg.bot .nm-msg-bubble {' +
        'background: #ffffff; color: ' + CONFIG.textColor + ';' +
        'border: 1px solid rgba(15,27,46,0.1);' +
        'border-bottom-left-radius: 4px;' +
      '}' +
      '.nm-msg.user .nm-msg-bubble {' +
        'background: ' + CONFIG.accentColor + '; color: #ffffff;' +
        'border-bottom-right-radius: 4px;' +
      '}' +
      '.nm-msg-time {' +
        'font-size: 10px; opacity: 0.5; margin-top: 4px; text-align: right;' +
      '}' +
      '.nm-typing {' +
        'display: flex; align-items: center; gap: 4px; padding: 10px 14px;' +
        'background: #ffffff; border: 1px solid rgba(15,27,46,0.1);' +
        'border-radius: 12px; align-self: flex-start; max-width: 60px;' +
        'border-bottom-left-radius: 4px;' +
      '}' +
      '.nm-typing span {' +
        'width: 6px; height: 6px; border-radius: 50%; background: #999;' +
        'animation: nmBounce 1.4s infinite ease-in-out both;' +
      '}' +
      '.nm-typing span:nth-child(1) { animation-delay: -0.32s; }' +
      '.nm-typing span:nth-child(2) { animation-delay: -0.16s; }' +
      '@keyframes nmBounce {' +
        '0%, 80%, 100% { transform: scale(0); }' +
        '40% { transform: scale(1); }' +
      '}' +
      '.nm-footer {' +
        'padding: 12px 16px 16px; border-top: 1px solid rgba(0,0,0,0.05);' +
        'flex-shrink: 0;' +
      '}' +
      '.nm-input-wrap {' +
        'display: flex; gap: 8px; align-items: flex-end;' +
      '}' +
      '.nm-input {' +
        'flex: 1; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px;' +
        'padding: 10px 14px; font-size: 13px; outline: none;' +
        'background: #ffffff; color: ' + CONFIG.textColor + ';' +
        'resize: none; font-family: inherit; line-height: 1.4; max-height: 80px;' +
      '}' +
      '.nm-input:focus { border-color: ' + CONFIG.primaryColor + '; }' +
      '.nm-input::placeholder { color: #999; }' +
      '.nm-send-btn {' +
        'width: 40px; height: 40px; border-radius: 50%; border: none;' +
        'background: ' + CONFIG.primaryColor + '; color: ' + CONFIG.accentColor + ';' +
        'cursor: pointer; display: flex; align-items: center; justify-content: center;' +
        'transition: opacity 0.2s; flex-shrink: 0;' +
      '}' +
      '.nm-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }' +
      '.nm-send-btn svg { width: 18px; height: 18px; }' +
      '.nm-disclaimer {' +
        'text-align: center; font-size: 10px; opacity: 0.4; padding: 8px 16px 0;' +
      '}' +
      '@media (max-width: 480px) {' +
        '.nm-window {' +
          'bottom: 0; right: 0; left: 0; top: 0;' +
          'width: 100%; height: 100%; border-radius: 0;' +
        '}' +
        '.nm-fab { bottom: 16px; right: 16px; }' +
      '}' +
    '</style>' +
    '<button class="nm-fab" id="nmFab" aria-label="Chat with Sofia">' +
      '<img src="' + CONFIG.avatar + '" alt="Sofia" />' +
    '</button>' +
    '<div class="nm-window" id="nmWindow">' +
      '<div class="nm-header">' +
        '<div class="nm-header-avatar"><img src="' + CONFIG.avatar + '" alt="Sofia" /></div>' +
        '<div class="nm-header-info">' +
          '<strong>' + CONFIG.name + '</strong>' +
          '<span>' + CONFIG.subtitle + '</span>' +
        '</div>' +
        '<button class="nm-close-btn" id="nmClose" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div class="nm-messages" id="nmMessages"></div>' +
      '<div class="nm-footer">' +
        '<div class="nm-input-wrap">' +
          '<textarea class="nm-input" id="nmInput" rows="1" placeholder="' + CONFIG.placeholder + '"></textarea>' +
          '<button class="nm-send-btn" id="nmSend" aria-label="Send message">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="nm-disclaimer">' + CONFIG.branding + '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(container);

  // ─── DOM REFS ───────────────────────────────────────
  var fab = document.getElementById('nmFab');
  var windowEl = document.getElementById('nmWindow');
  var messagesEl = document.getElementById('nmMessages');
  var inputEl = document.getElementById('nmInput');
  var sendBtn = document.getElementById('nmSend');
  var closeBtn = document.getElementById('nmClose');

  // ─── LOAD STORED MESSAGES ───────────────────────────
  function loadMessages() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        messages = JSON.parse(stored);
        if (!Array.isArray(messages)) messages = [];
      }
    } catch(e) { messages = []; }
  }

  function saveMessages() {
    try {
      var toStore = messages.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch(e) {}
  }

  // ─── RENDER ─────────────────────────────────────────
  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach(function(msg) {
      var div = document.createElement('div');
      div.className = 'nm-msg ' + msg.role;
      if (msg.role === 'bot') {
        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'nm-msg-avatar';
        avatarDiv.innerHTML = '<img src="' + CONFIG.avatar + '" alt="Sofia" />';
        div.appendChild(avatarDiv);
      }
      var bubble = document.createElement('div');
      bubble.className = 'nm-msg-bubble';
      bubble.textContent = msg.content;
      div.appendChild(bubble);
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ─── SEND MESSAGE ──────────────────────────────────
  function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    messages.push({ role: 'user', content: text.trim() });
    saveMessages();
    renderMessages();
    inputEl.value = '';
    inputEl.style.height = 'auto';

    isLoading = true;
    showTyping();

    fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.map(function(m) {
        return { role: m.role, content: m.content };
      })})
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      isLoading = false;
      hideTyping();
      if (data.content) {
        messages.push({ role: 'bot', content: data.content });
        saveMessages();
        renderMessages();
      } else if (data.error) {
        messages.push({ role: 'bot', content: 'Sorry, I had trouble connecting. Please try again or contact us directly.' });
        saveMessages();
        renderMessages();
      }
    })
    .catch(function() {
      isLoading = false;
      hideTyping();
      messages.push({ role: 'bot', content: 'Sorry, I had trouble connecting. Please try again or contact us directly.' });
      saveMessages();
      renderMessages();
    });
  }

  // ─── TYPING INDICATOR ──────────────────────────────
  var typingEl = null;
  function showTyping() {
    if (!typingEl) {
      typingEl = document.createElement('div');
      typingEl.className = 'nm-typing';
      typingEl.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(typingEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) {
      typingEl.parentNode.removeChild(typingEl);
    }
    typingEl = null;
  }

  // ─── TOGGLE WIDGET ─────────────────────────────────
  function openWidget() {
    isOpen = true;
    windowEl.style.display = 'flex';
    fab.style.display = 'none';
    if (messages.length === 0) {
      messages.push({ role: 'bot', content: CONFIG.greeting });
      saveMessages();
    }
    renderMessages();
    setTimeout(function() { inputEl.focus(); }, 300);
  }

  function closeWidget() {
    isOpen = false;
    windowEl.style.display = 'none';
    fab.style.display = 'block';
  }

  // ─── AUTO-RESIZE TEXTAREA ──────────────────────────
  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
  }

  // ─── EVENT LISTENERS ───────────────────────────────
  fab.addEventListener('click', openWidget);
  closeBtn.addEventListener('click', closeWidget);

  sendBtn.addEventListener('click', function() {
    sendMessage(inputEl.value);
  });

  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value);
    }
  });

  inputEl.addEventListener('input', autoResize);

  // ─── INIT ───────────────────────────────────────────
  loadMessages();
})();
