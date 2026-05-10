(function() {
  'use strict';

  const config = window.SITE_CHAT_CONFIG || {};
  const API_URL = 'https://saabai-site.vercel.app/api/site-factory/chat';

  // Create widget container
  const container = document.createElement('div');
  container.id = 'saabai-chat-widget';
  container.innerHTML = `
    <style>
      #saabai-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: Inter, system-ui, sans-serif; }
      #saabai-chat-btn { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #c9a227, #e2c053); border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(201,162,39,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
      #saabai-chat-btn:hover { transform: scale(1.05); }
      #saabai-chat-btn svg { width: 28px; height: 28px; color: #000; }
      #saabai-chat-panel { position: absolute; bottom: 70px; right: 0; width: 360px; max-height: 500px; background: #111820; border: 1px solid #1e2a35; border-radius: 16px; overflow: hidden; display: none; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
      #saabai-chat-panel.open { display: flex; }
      #saabai-chat-header { padding: 16px 20px; background: linear-gradient(135deg, rgba(201,162,39,0.15), rgba(201,162,39,0.05)); border-bottom: 1px solid #1e2a35; }
      #saabai-chat-header h4 { margin: 0; color: #e8e4dc; font-size: 15px; font-weight: 600; }
      #saabai-chat-header p { margin: 4px 0 0; color: #7a8a9a; font-size: 12px; }
      #saabai-chat-messages { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; max-height: 350px; }
      .saabai-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; word-wrap: break-word; }
      .saabai-msg.user { align-self: flex-end; background: linear-gradient(135deg, #c9a227, #e2c053); color: #000; border-bottom-right-radius: 4px; }
      .saabai-msg.bot { align-self: flex-start; background: #1a2430; color: #e8e4dc; border-bottom-left-radius: 4px; }
      #saabai-chat-input-area { padding: 12px 16px; border-top: 1px solid #1e2a35; display: flex; gap: 8px; }
      #saabai-chat-input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #1e2a35; background: #0a0f14; color: #e8e4dc; font-size: 13px; outline: none; }
      #saabai-chat-input::placeholder { color: #5a6a7a; }
      #saabai-chat-send { padding: 10px 16px; border-radius: 8px; border: none; background: #c9a227; color: #000; font-size: 13px; font-weight: 600; cursor: pointer; }
      #saabai-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
      .saabai-typing { display: flex; gap: 4px; padding: 10px 14px; }
      .saabai-typing span { width: 8px; height: 8px; background: #7a8a9a; border-radius: 50%; animation: saabai-bounce 1.4s infinite ease-in-out both; }
      .saabai-typing span:nth-child(1) { animation-delay: -0.32s; }
      .saabai-typing span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes saabai-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    </style>
    <button id="saabai-chat-btn" aria-label="Open chat">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
    </button>
    <div id="saabai-chat-panel">
      <div id="saabai-chat-header">
        <h4>${config.businessName || 'Chat'}</h4>
        <p>AI Assistant • Typically replies instantly</p>
      </div>
      <div id="saabai-chat-messages"></div>
      <div id="saabai-chat-input-area">
        <input id="saabai-chat-input" type="text" placeholder="Type your message..." />
        <button id="saabai-chat-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById('saabai-chat-btn');
  const panel = document.getElementById('saabai-chat-panel');
  const messages = document.getElementById('saabai-chat-messages');
  const input = document.getElementById('saabai-chat-input');
  const sendBtn = document.getElementById('saabai-chat-send');
  let isOpen = false;
  let isLoading = false;

  function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `saabai-msg ${isUser ? 'user' : 'bot'}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.id = 'saabai-typing-indicator';
    div.className = 'saabai-msg bot saabai-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('saabai-typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    addMessage(text, true);
    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          businessName: config.businessName,
          systemPrompt: config.systemPrompt,
        }),
      });
      const data = await res.json();
      hideTyping();
      addMessage(data.content || data.text || 'Sorry, I had trouble responding. Please try again.', false);
    } catch (e) {
      hideTyping();
      addMessage('Sorry, I\'m having trouble connecting. Please try again later.', false);
    }
    isLoading = false;
    sendBtn.disabled = false;
  }

  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && messages.children.length === 0) {
      addMessage(config.greeting || 'Hi! How can I help you today?', false);
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  // Global function for sites that call window.openChat()
  window.openChat = function() {
    isOpen = true;
    panel.classList.add('open');
    if (messages.children.length === 0) {
      addMessage(config.greeting || 'Hi! How can I help you today?', false);
    }
  };
})();
