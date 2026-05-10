(function() {
  'use strict';
  
  const CONFIG = {
    name: 'Sophie',
    avatar: '/clients/nextinvestment/assets/avatar-sophie.png',
    brandColor: '#0a1628',
    accentColor: '#c9a227',
    bgColor: '#f5f0e8',
    textColor: '#1a1a2e',
    apiEndpoint: 'https://www.saabai.ai/api/nextinvestment-chat',
    systemPrompt: `You are Sophie, a knowledgeable and friendly Australian property buyer\'s advocate based in Adelaide. You work for Next Investment, helping clients buy wholesale residential property below market price across Australia, with deep expertise in South Australian markets. You are warm, professional, and conversational. You help with: property sourcing, negotiation strategies, first home buyer guidance, portfolio growth advice, market insights for Adelaide and Australian property markets. You never represent sellers - only buyers. Keep responses concise and actionable.`,
    greeting: "Hi there! I'm Sophie, your property advocate at Next Investment. Looking to buy below market value? I'm here to help!",
    placeholder: "Ask about property, Adelaide markets, or buying strategy..."
  };

  const STORAGE_KEY = 'ni-chat-history';
  let messages = [];
  let isOpen = false;
  let isTyping = false;

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
    .ni-chat-widget { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: Inter, -apple-system, sans-serif; }
    .ni-chat-button {
      width: 60px; height: 60px; border-radius: 50%; border: none;
      background: ${CONFIG.accentColor}; color: white; cursor: pointer;
      box-shadow: 0 4px 20px rgba(201, 162, 39, 0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .ni-chat-button:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(201, 162, 39, 0.5); }
    .ni-chat-button img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid white; }
    .ni-chat-panel {
      position: absolute; bottom: 76px; right: 0;
      width: 380px; max-width: calc(100vw - 48px); height: 520px; max-height: calc(100vh - 120px);
      background: ${CONFIG.bgColor}; border-radius: 16px;
      box-shadow: 0 24px 80px rgba(10, 22, 40, 0.25);
      display: flex; flex-direction: column; overflow: hidden;
      transition: opacity 0.25s, transform 0.25s;
      opacity: 0; transform: translateY(12px) scale(0.96); pointer-events: none;
    }
    .ni-chat-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .ni-chat-header {
      padding: 16px 20px; background: ${CONFIG.brandColor}; color: white;
      display: flex; align-items: center; gap: 12px;
    }
    .ni-chat-header img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${CONFIG.accentColor}; }
    .ni-chat-header-info { flex: 1; }
    .ni-chat-header-name { font-weight: 700; font-size: 15px; }
    .ni-chat-header-status { font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 6px; }
    .ni-chat-header-status::before { content: ''; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
    .ni-chat-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7; }
    .ni-chat-close:hover { opacity: 1; }
    .ni-chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .ni-chat-message { display: flex; gap: 10px; max-width: 85%; }
    .ni-chat-message.user { align-self: flex-end; flex-direction: row-reverse; }
    .ni-chat-message.bot { align-self: flex-start; }
    .ni-chat-message-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .ni-chat-message-user-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: ${CONFIG.brandColor};
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; flex-shrink: 0;
    }
    .ni-chat-message-content {
      padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5;
      word-break: break-word;
    }
    .ni-chat-message.bot .ni-chat-message-content { background: white; color: ${CONFIG.textColor}; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .ni-chat-message.user .ni-chat-message-content { background: ${CONFIG.brandColor}; color: white; border-bottom-right-radius: 4px; }
    .ni-chat-typing { display: flex; gap: 4px; padding: 12px 14px; background: white; border-radius: 14px; border-bottom-left-radius: 4px; width: fit-content; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .ni-chat-typing-dot { width: 8px; height: 8px; background: #ccc; border-radius: 50%; animation: ni-typing 1.4s infinite; }
    .ni-chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .ni-chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ni-typing { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
    .ni-chat-input-area { padding: 16px 20px; border-top: 1px solid rgba(0,0,0,0.08); display: flex; gap: 10px; }
    .ni-chat-input {
      flex: 1; padding: 10px 16px; border: 1px solid rgba(0,0,0,0.12); border-radius: 24px;
      font-size: 14px; outline: none; background: white; color: ${CONFIG.textColor};
    }
    .ni-chat-input:focus { border-color: ${CONFIG.accentColor}; }
    .ni-chat-send {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: ${CONFIG.accentColor}; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s;
    }
    .ni-chat-send:hover { transform: scale(1.05); }
    .ni-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 480px) {
      .ni-chat-widget { bottom: 16px; right: 16px; }
      .ni-chat-panel { width: calc(100vw - 32px); right: -8px; }
    }
  `;
  document.head.appendChild(styles);

  // Create widget HTML
  const widget = document.createElement('div');
  widget.className = 'ni-chat-widget';
  widget.innerHTML = `
    <button class="ni-chat-button" aria-label="Chat with ${CONFIG.name}">
      <img src="${CONFIG.avatar}" alt="${CONFIG.name}">
    </button>
    <div class="ni-chat-panel">
      <div class="ni-chat-header">
        <img src="${CONFIG.avatar}" alt="${CONFIG.name}">
        <div class="ni-chat-header-info">
          <div class="ni-chat-header-name">${CONFIG.name}</div>
          <div class="ni-chat-header-status">Online now</div>
        </div>
        <button class="ni-chat-close">&times;</button>
      </div>
      <div class="ni-chat-messages"></div>
      <div class="ni-chat-input-area">
        <input class="ni-chat-input" type="text" placeholder="${CONFIG.placeholder}">
        <button class="ni-chat-send" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const button = widget.querySelector('.ni-chat-button');
  const panel = widget.querySelector('.ni-chat-panel');
  const closeBtn = widget.querySelector('.ni-chat-close');
  const messagesContainer = widget.querySelector('.ni-chat-messages');
  const input = widget.querySelector('.ni-chat-input');
  const sendBtn = widget.querySelector('.ni-chat-send');

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) {
      addMessage('bot', CONFIG.greeting);
    }
    if (isOpen) setTimeout(() => input.focus(), 100);
  }

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
    div.className = `ni-chat-message ${msg.role}`;
    if (msg.role === 'bot') {
      div.innerHTML = `
        <img class="ni-chat-message-avatar" src="${CONFIG.avatar}" alt="${CONFIG.name}">
        <div class="ni-chat-message-content">${mdToHtml(msg.text)}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="ni-chat-message-user-avatar">You</div>
        <div class="ni-chat-message-content">${mdToHtml(msg.text)}</div>
      `;
    }
    messagesContainer.appendChild(div);
  }

  function mdToHtml(text) {
    // Basic markdown to HTML converter
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-size:12px;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:' + CONFIG.accentColor + ';text-decoration:underline;">$1</a>');
    
    // Lists
    const lines = html.split('\n');
    let inList = false;
    let listType = '';
    const result = [];
    for (const line of lines) {
      const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
      const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') { result.push('<ul style="margin:4px 0;padding-left:18px;">'); inList = true; listType = 'ul'; }
        result.push('<li>' + ulMatch[1] + '</li>');
      } else if (olMatch) {
        if (!inList || listType !== 'ol') { result.push('<ol style="margin:4px 0;padding-left:18px;">'); inList = true; listType = 'ol'; }
        result.push('<li>' + olMatch[1] + '</li>');
      } else {
        if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        result.push('<p style="margin:4px 0;">' + line + '</p>');
      }
    }
    if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
    return result.join('');
  }

  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const div = document.createElement('div');
    div.className = 'ni-chat-message bot';
    div.id = 'ni-typing-indicator';
    div.innerHTML = `
      <img class="ni-chat-message-avatar" src="${CONFIG.avatar}" alt="${CONFIG.name}">
      <div class="ni-chat-typing"><div class="ni-chat-typing-dot"></div><div class="ni-chat-typing-dot"></div><div class="ni-chat-typing-dot"></div></div>
    `;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    isTyping = false;
    const indicator = document.getElementById('ni-typing-indicator');
    if (indicator) indicator.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    sendBtn.disabled = true;
    addMessage('user', text);
    showTyping();

    try {
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter(m => m.text !== CONFIG.greeting && m.role !== 'system')
            .slice(-10)
            .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
        })
      });

      hideTyping();
      if (response.ok) {
        const data = await response.json();
        const reply = data.content || data.text || data.message?.content || "I'm sorry, I didn't catch that. Could you rephrase?";
        addMessage('bot', reply);
      } else {
        addMessage('bot', "I'm having trouble thinking right now. Please try again!");
      }
    } catch (err) {
      hideTyping();
      addMessage('bot', "Connection issue. Please check your internet and try again.");
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