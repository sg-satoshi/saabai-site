(function() {
  'use strict';
  
  const CONFIG = {
    name: 'Zara',
    avatar: '/clients/lmm-site/assets/avatar-zara.png?v=2',
    brandColor: '#0b5d55',
    accentColor: '#c49a3a',
    bgColor: '#f8faf7',
    textColor: '#102225',
    slug: 'lmm-site',
    apiEndpoint: 'https://www.saabai.ai/api/chat-platform/message',
    configEndpoint: 'https://www.saabai.ai/api/chat-platform/config?site=lmm-site',
    eventEndpoint: 'https://www.saabai.ai/api/chat-platform/event',
    placeholder: "Ask about finance, strategy, or property wealth..."
  };

  let greeting = '';
  let goal = null;

  const STORAGE_KEY = 'lmm-chat-history';
  let messages = [];
  let isOpen = false;
  let isTyping = false;
  let chatbotOff = false;
  let offMessage = '';

  fetch(CONFIG.configEndpoint)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c) return;
      if (typeof c.greeting === 'string') greeting = c.greeting;
      if (c.handoff && c.handoff.href && c.handoff.label) showHandoff(c.handoff);
      if (c.goal) goal = c.goal;
      if (typeof c.avatarUrl === 'string' && c.avatarUrl.trim()) {
        CONFIG.avatar = c.avatarUrl.trim();
        document.querySelectorAll('.lmm-chat-button img, .lmm-chat-header img, .lmm-chat-message-avatar').forEach(function (img) { img.src = CONFIG.avatar; });
      }
      if (c.active === false) {
        chatbotOff = true;
        offMessage = c.offMessage || "Our chat assistant is taking a break. Please call or email the team directly and they'll be happy to help.";
      }
    })
    .catch(function () {});

  // Load history
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) messages = JSON.parse(saved);
  } catch(e) {}

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch(e) {}
  }

  // Create styles
  const styles = document.createElement('style');
  styles.textContent = `
    .lmm-chat-widget { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: Inter, -apple-system, sans-serif; -webkit-transform: translateZ(0); transform: translateZ(0); }
    .lmm-chat-button {
      width: 64px; height: 64px; border-radius: 50%; border: 2px solid ${CONFIG.accentColor}; padding: 0; overflow: hidden;
      background: #fff; color: white; cursor: pointer;
      box-shadow: 0 4px 20px rgba(196, 154, 58, 0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .lmm-chat-button:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(196, 154, 58, 0.5); }
    .lmm-chat-button img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: 50% 22%; display: block; border: none; }
    .lmm-chat-panel {
      position: absolute; bottom: 76px; right: 0;
      width: 380px; max-width: calc(100vw - 48px); height: 520px; max-height: calc(100vh - 120px);
      background: ${CONFIG.bgColor}; border-radius: 16px;
      box-shadow: 0 24px 80px rgba(11, 93, 85, 0.25);
      display: flex; flex-direction: column; overflow: hidden;
      transition: opacity 0.25s, transform 0.25s;
      opacity: 0; transform: translateY(12px) scale(0.96); pointer-events: none;
    }
    .lmm-chat-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .lmm-chat-header {
      padding: 16px 20px; background: ${CONFIG.brandColor}; color: white;
      display: flex; align-items: center; gap: 12px;
    }
    .lmm-chat-header img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; object-position: 50% 22%; border: 1.5px solid ${CONFIG.accentColor}; }
    .lmm-chat-header-info { flex: 1; }
    .lmm-chat-header-name { font-weight: 700; font-size: 15px; }
    .lmm-chat-header-status { font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 6px; }
    .lmm-chat-header-status::before { content: ''; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
    .lmm-chat-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7; }
    .lmm-chat-close:hover { opacity: 1; }
    .lmm-chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .lmm-chat-message { display: flex; gap: 10px; max-width: 85%; }
    .lmm-chat-message.user { align-self: flex-end; flex-direction: row-reverse; }
    .lmm-chat-message.bot { align-self: flex-start; }
    .lmm-chat-message-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; object-position: 50% 22%; flex-shrink: 0; }
    .lmm-chat-message-user-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: ${CONFIG.brandColor};
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; flex-shrink: 0;
    }
    .lmm-chat-message-content {
      padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5;
      word-break: break-word;
    }
    .lmm-chat-message.bot .lmm-chat-message-content { background: white; color: ${CONFIG.textColor}; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .lmm-chat-message.user .lmm-chat-message-content { background: ${CONFIG.brandColor}; color: white; border-bottom-right-radius: 4px; }
    .lmm-chat-typing { display: flex; gap: 4px; padding: 12px 14px; background: white; border-radius: 14px; border-bottom-left-radius: 4px; width: fit-content; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .lmm-chat-typing-dot { width: 8px; height: 8px; background: #ccc; border-radius: 50%; animation: lmm-typing 1.4s infinite; }
    .lmm-chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .lmm-chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes lmm-typing { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
    .lmm-chat-input-area { padding: 16px 20px; border-top: 1px solid rgba(0,0,0,0.08); display: flex; gap: 10px; }
    .lmm-chat-input {
      flex: 1; padding: 10px 16px; border: 1px solid rgba(0,0,0,0.12); border-radius: 24px;
      font-size: 14px; outline: none; background: white; color: ${CONFIG.textColor};
    }
    .lmm-chat-input:focus { border-color: ${CONFIG.accentColor}; }
    .lmm-chat-send {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: ${CONFIG.accentColor}; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s;
    }
    .lmm-chat-send:hover { transform: scale(1.05); }
    .lmm-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 480px) {
      .lmm-chat-widget { bottom: 16px; right: 16px; }
      .lmm-chat-button { width: 58px; height: 58px; }
      .lmm-chat-panel { width: calc(100vw - 32px); right: -8px; height: 70vh; max-height: 520px; }
      .lmm-chat-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    }
  `;
  document.head.appendChild(styles);

  // Create widget HTML
  const widget = document.createElement('div');
  widget.className = 'lmm-chat-widget';
  widget.innerHTML = `
    <button class="lmm-chat-button" aria-label="Chat with ${CONFIG.name}">
      <img src="${CONFIG.avatar}" alt="${CONFIG.name}">
    </button>
    <div class="lmm-chat-panel">
      <div class="lmm-chat-header">
        <img src="${CONFIG.avatar}" alt="${CONFIG.name}">
        <div class="lmm-chat-header-info">
          <div class="lmm-chat-header-name">${CONFIG.name}</div>
          <div class="lmm-chat-header-status">Online now</div>
        </div>
        <button class="lmm-chat-close">&times;</button>
      </div>
      <div class="lmm-chat-messages"></div>
      <div class="lmm-chat-input-area">
        <input class="lmm-chat-input" type="text" placeholder="${CONFIG.placeholder}">
        <button class="lmm-chat-send" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const button = widget.querySelector('.lmm-chat-button');
  const panel = widget.querySelector('.lmm-chat-panel');
  const closeBtn = widget.querySelector('.lmm-chat-close');
  const messagesContainer = widget.querySelector('.lmm-chat-messages');
  const input = widget.querySelector('.lmm-chat-input');
  const sendBtn = widget.querySelector('.lmm-chat-send');
  const handoffRow = document.createElement('div');
  handoffRow.style.cssText = 'text-align:center;padding:0 16px 8px;';
  widget.querySelector('.lmm-chat-input-area').before(handoffRow);

  function showHandoff(link) {
    handoffRow.textContent = '';
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.cssText = 'font-size:13px;color:#0b5d55;';
    a.addEventListener('click', function () {
      fetch(CONFIG.eventEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: CONFIG.slug, event: 'handoff' })
      }).catch(function () {});
    });
    handoffRow.appendChild(a);
  }

  // Quick replies and the CTA button. Shown under the latest bot message only, never saved.
  function safeLink(u) {
    if (typeof u !== 'string') return '';
    if (/^mailto:[^\s@]+@[^\s@]+/i.test(u) || /^tel:\+?[0-9]{6,20}$/i.test(u)) return u;
    try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; }
  }
  function track(ev) {
    fetch(CONFIG.eventEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: CONFIG.slug, event: ev }) }).catch(function () {});
  }
  function showExtras(replies, btn) {
    const old = messagesContainer.querySelector('.lmm-extras');
    if (old) old.remove();
    if ((!replies || !replies.length) && !btn) return;
    const row = document.createElement('div');
    row.className = 'lmm-extras';
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px 40px;';
    const href = btn ? safeLink(btn.url) : '';
    if (btn && href) {
      const a = document.createElement('a');
      a.href = href; a.textContent = btn.label;
      if (href.indexOf('https:') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
      const fb = btn.kind === 'fallback';
      a.style.cssText = 'flex-basis:100%;width:fit-content;padding:9px 14px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;' + (fb ? 'background:#fff;color:#0b5d55;border:1.5px solid #0b5d55;' : 'background:#0b5d55;color:#fff;border:1.5px solid #0b5d55;');
      a.addEventListener('click', function () { track(fb ? 'fallback_click' : 'cta_click'); });
      row.appendChild(a);
    }
    (replies || []).slice(0, 4).forEach(function (t) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t;
      b.style.cssText = 'border:1.5px solid #0b5d55;background:#fff;color:#0b5d55;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;min-height:34px;';
      b.addEventListener('click', function () { input.value = t; sendMessage(); });
      row.appendChild(b);
    });
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function saabaiSheet(panelEl, open) {
    var src = 'https://www.saabai.ai/chat-sheet.js?v=1';
    function run() {
      if (!window.SaabaiChatSheet) return;
      if (!panelEl._saabaiSheet) panelEl._saabaiSheet = window.SaabaiChatSheet.attach(panelEl);
      panelEl._saabaiSheet.setOpen(!!open);
    }
    if (window.SaabaiChatSheet) { run(); return; }
    var existing = document.querySelector('script[data-saabai-sheet]');
    if (existing) { existing.addEventListener('load', run); return; }
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-saabai-sheet', '1');
    s.onload = run;
    document.head.appendChild(s);
  }

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    saabaiSheet(panel, isOpen);
    if (isOpen && messages.length === 0 && greeting) {
      addMessage('bot', greeting);
      if (goal && goal.quickReplies) showExtras(goal.quickReplies, null);
    }
    if (isOpen) setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 100);
  }
  saabaiSheet(panel, false);

  button.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  function addMessage(role, text) {
    const msg = { role, text, time: Date.now() };
    messages.push(msg);
    saveHistory();
    renderMessage(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `lmm-chat-message ${msg.role}`;
    if (msg.role === 'bot') {
      div.innerHTML = `
        <img class="lmm-chat-message-avatar" src="${CONFIG.avatar}" alt="${CONFIG.name}">
        <div class="lmm-chat-message-content">${mdToHtml(msg.text)}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="lmm-chat-message-user-avatar">You</div>
        <div class="lmm-chat-message-content">${mdToHtml(msg.text)}</div>
      `;
    }
    messagesContainer.appendChild(div);
  }

  function mdToHtml(text) {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Lists
    html = html.split('\n').map(line => {
      if (/^\s*-\s+/.test(line)) return '<li>' + line.replace(/^\s*-\s+/, '') + '</li>';
      if (/^\s*\d+\.\s+/.test(line)) return '<li>' + line.replace(/^\s*\d+\.\s+/, '') + '</li>';
      return line;
    }).join('\n');
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, m => {
      const tag = m.trim().startsWith('<li>1') ? 'ol' : 'ul';
      return '<' + tag + '>' + m.replace(/\n/g, '') + '</' + tag + '>';
    });
    html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    if (html.includes('<p>')) html = '<p>' + html + '</p>';
    return html;
  }

  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const div = document.createElement('div');
    div.className = 'lmm-chat-message bot';
    div.id = 'lmm-typing-indicator';
    div.innerHTML = `
      <img class="lmm-chat-message-avatar" src="${CONFIG.avatar}" alt="${CONFIG.name}">
      <div class="lmm-chat-typing"><div class="lmm-chat-typing-dot"></div><div class="lmm-chat-typing-dot"></div><div class="lmm-chat-typing-dot"></div></div>
    `;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    isTyping = false;
    const indicator = document.getElementById('lmm-typing-indicator');
    if (indicator) indicator.remove();
  }

  async function sendMessage() {
    showExtras(null, null);
    const text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    sendBtn.disabled = true;
    addMessage('user', text);
    if (chatbotOff) {
      addMessage('bot', offMessage || "Our chat assistant is taking a break. Please call or email the team directly and they'll be happy to help.");
      sendBtn.disabled = input.value.trim() === '';
      return;
    }
    showTyping();

    try {
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: CONFIG.slug,
          messages: messages
            .filter(m => m.text !== greeting && m.role !== 'system')
            .slice(-10)
            .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
        })
      });

      hideTyping();
      if (response.ok || response.status === 429 || response.status === 403 || response.status === 404) {
        const data = await response.json();
        if (data.chatbotOff) {
          chatbotOff = true;
          offMessage = data.content || offMessage;
        }
        const reply = data.content || data.text || data.message?.content || "I'm sorry, I didn't catch that. Could you rephrase?";
        addMessage('bot', reply);
        showExtras(data.quickReplies, data.cta && data.cta.label ? data.cta : null);
      } else if (response.status >= 500) {
        addMessage('bot', "I'm having trouble thinking right now. Please try again!");
      } else {
        addMessage('bot', "I'm having trouble connecting right now. Please try again in a moment!");
      }
    } catch (err) {
      hideTyping();
      addMessage('bot', "Connection lost. Please check your internet and try again.");
    }
    sendBtn.disabled = input.value.trim() === '';
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  input.addEventListener('input', () => { sendBtn.disabled = input.value.trim() === ''; });

  // Restore history
  messages.forEach(renderMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Proactive open after 45s
  setTimeout(() => {
    if (!isOpen && messages.length === 0) {
      togglePanel();
    }
  }, 45000);

})();