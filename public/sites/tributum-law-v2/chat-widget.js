(function() {
  'use strict';

  const CONFIG = {
    name: 'Mike',
    subtitle: 'Tributum AI Assistant',
    avatar: '/sites/tributum-law-v2/mathew-brittingham.jpg',
    brandColor: '#0F1B2E',
    accentColor: '#B8860B',
    bgColor: '#FAF8F5',
    textColor: '#1A1A1A',
    apiEndpoint: '/api/tributum-chat',
    greeting: "Hello. I'm Mike, Tributum Law's AI assistant. I can help with questions about tax law, ATO disputes, trusts, estate planning — or get you connected with the team. How can I help?",
    placeholder: "Ask about tax law, trusts, ATO disputes..."
  };

  const STORAGE_KEY = 'tributum-chat-history';
  let messages = [];
  let isOpen = false;
  let isTyping = false;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) messages = JSON.parse(saved);
  } catch(e) {}

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch(e) {}
  }

  const styles = document.createElement('style');
  styles.textContent = `
    .trib-chat-widget { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: 'Cormorant Garamond', Georgia, serif; -webkit-transform: translateZ(0); transform: translateZ(0); }
    .trib-chat-button {
      width: 60px; height: 60px; border-radius: 50%; border: none;
      background: ${CONFIG.accentColor}; color: white; cursor: pointer;
      box-shadow: 0 4px 20px rgba(184, 134, 11, 0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 22px; font-weight: 600;
    }
    .trib-chat-button:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(184, 134, 11, 0.5); }
    .trib-chat-panel {
      position: absolute; bottom: 76px; right: 0;
      width: 380px; max-width: calc(100vw - 48px); height: 520px; max-height: calc(100vh - 120px);
      background: ${CONFIG.bgColor}; border-radius: 16px;
      box-shadow: 0 24px 80px rgba(15, 27, 46, 0.25);
      display: flex; flex-direction: column; overflow: hidden;
      transition: opacity 0.25s, transform 0.25s;
      opacity: 0; transform: translateY(12px) scale(0.96); pointer-events: none;
      border: 1px solid rgba(184, 134, 11, 0.2);
    }
    .trib-chat-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .trib-chat-header {
      padding: 16px 20px; background: ${CONFIG.brandColor}; color: white;
      display: flex; align-items: center; gap: 12px;
    }
    .trib-chat-header-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: ${CONFIG.accentColor}; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 600; border: 2px solid rgba(184, 134, 11, 0.5);
    }
    .trib-chat-header-info { flex: 1; }
    .trib-chat-header-name { font-weight: 700; font-size: 15px; font-family: 'Cormorant Garamond', Georgia, serif; }
    .trib-chat-header-status { font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 6px; }
    .trib-chat-header-status::before { content: ''; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
    .trib-chat-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7; }
    .trib-chat-close:hover { opacity: 1; }
    .trib-chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .trib-chat-message { display: flex; gap: 10px; max-width: 85%; }
    .trib-chat-message.user { align-self: flex-end; flex-direction: row-reverse; }
    .trib-chat-message.bot { align-self: flex-start; }
    .trib-chat-message-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: ${CONFIG.accentColor};
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; flex-shrink: 0;
    }
    .trib-chat-message-user-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: ${CONFIG.brandColor};
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; flex-shrink: 0;
    }
    .trib-chat-message-content {
      padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5;
      word-break: break-word; font-family: 'Inter', -apple-system, sans-serif;
    }
    .trib-chat-message.bot .trib-chat-message-content { background: #ffffff; color: #1A1A1A; border: 1px solid rgba(15, 27, 46, 0.15); }
    .trib-chat-message.user .trib-chat-message-content { background: ${CONFIG.brandColor}; color: #ffffff; }
    .trib-chat-typing { display: flex; gap: 4px; padding: 12px 14px; }
    .trib-chat-typing span { width: 8px; height: 8px; background: ${CONFIG.accentColor}; border-radius: 50%; animation: tribTyping 1.4s infinite; }
    .trib-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
    .trib-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes tribTyping { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    .trib-chat-input-area { padding: 12px 16px 16px; border-top: 1px solid rgba(15, 27, 46, 0.08); display: flex; gap: 8px; }
    .trib-chat-input {
      flex: 1; padding: 10px 14px; border: 1px solid rgba(15, 27, 46, 0.15);
      border-radius: 10px; font-size: 14px; outline: none; background: white;
      font-family: 'Inter', -apple-system, sans-serif;
    }
    .trib-chat-input:focus { border-color: ${CONFIG.accentColor}; }
    .trib-chat-send {
      padding: 10px 16px; background: ${CONFIG.accentColor}; color: white;
      border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s;
    }
    .trib-chat-send:hover { opacity: 0.9; }
    .trib-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 480px) {
      .trib-chat-widget { bottom: 16px; right: 16px; }
      .trib-chat-panel { width: calc(100vw - 32px); right: -8px; }
    }
  `;
  document.head.appendChild(styles);

  const widget = document.createElement('div');
  widget.className = 'trib-chat-widget';

  const button = document.createElement('button');
  button.className = 'trib-chat-button';
  button.innerHTML = `<img src="${CONFIG.avatar}" alt="Mike" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid white;" />`;
  button.setAttribute('aria-label', 'Open chat');

  const panel = document.createElement('div');
  panel.className = 'trib-chat-panel';

  panel.innerHTML = `
    <div class="trib-chat-header">
      <div class="trib-chat-header-avatar"><img src="${CONFIG.avatar}" alt="Mike" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" /></div>
      <div class="trib-chat-header-info">
        <div class="trib-chat-header-name">${CONFIG.name}</div>
        <div class="trib-chat-header-status">${CONFIG.subtitle}</div>
      </div>
      <button class="trib-chat-close" aria-label="Close">&times;</button>
    </div>
    <div class="trib-chat-messages"></div>
    <div class="trib-chat-input-area">
      <input type="text" class="trib-chat-input" placeholder="${CONFIG.placeholder}" />
      <button class="trib-chat-send">Send</button>
    </div>
  `;

  widget.appendChild(panel);
  widget.appendChild(button);
  document.body.appendChild(widget);

  const messagesEl = panel.querySelector('.trib-chat-messages');
  const inputEl = panel.querySelector('.trib-chat-input');
  const sendBtn = panel.querySelector('.trib-chat-send');
  const closeBtn = panel.querySelector('.trib-chat-close');

  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach((msg, i) => {
      const div = document.createElement('div');
      div.className = `trib-chat-message ${msg.role}`;
      const avatar = document.createElement('div');
      if (msg.role === 'user') {
        avatar.className = 'trib-chat-message-user-avatar';
        avatar.textContent = 'You';
      } else {
        avatar.className = 'trib-chat-message-avatar';
        avatar.innerHTML = `<img src="${CONFIG.avatar}" alt="Mike" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
      }
      const content = document.createElement('div');
      content.className = 'trib-chat-message-content';
      content.textContent = msg.content;
      div.appendChild(avatar);
      div.appendChild(content);
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, content) {
    messages.push({ role, content });
    saveHistory();
    renderMessages();
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'trib-chat-message bot';
    div.id = 'trib-typing';
    div.innerHTML = `
      <div class="trib-chat-message-avatar"><img src="${CONFIG.avatar}" alt="Mike" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" /></div>
      <div class="trib-chat-message-content trib-chat-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('trib-typing');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    if (!text.trim() || isTyping) return;
    addMessage('user', text.trim());
    inputEl.value = '';
    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-20) }),
      });
      hideTyping();
      if (res.ok) {
        const data = await res.json();
        addMessage('assistant', data.content || 'I apologise, I did not catch that. Could you rephrase?');
      } else {
        addMessage('assistant', 'I apologise, I am having trouble connecting. Please try again or call us on +61 405 014 888.');
      }
    } catch (err) {
      hideTyping();
      addMessage('assistant', 'I apologise, I am having trouble connecting. Please try again or call us on +61 405 014 888.');
    }
    isTyping = false;
    sendBtn.disabled = false;
  }

  // Show greeting on first open
  let firstOpen = true;
  button.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && firstOpen && messages.length === 0) {
      firstOpen = false;
      setTimeout(() => addMessage('assistant', CONFIG.greeting), 400);
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('open');
  });

  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(inputEl.value);
  });

  // Restore history on load
  if (messages.length > 0) renderMessages();
})();
