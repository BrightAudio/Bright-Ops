import { NextResponse } from 'next/server';

export async function GET() {
  const widgetScript = `
(function() {
  // Chat Widget for newsound.productions
  const SUPABASE_URL = '${process.env.NEXT_PUBLIC_SUPABASE_URL}';
  const SUPABASE_ANON_KEY = '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}';
  
  let conversationId = localStorage.getItem('chat_conversation_id');
  let isOpen = false;
  let messages = [];
  let pollInterval;

  // Create widget HTML
  const widgetHTML = \`
    <style>
      #bright-chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #bright-chat-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      #bright-chat-button:hover {
        transform: scale(1.1);
      }
      #bright-chat-button svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      #bright-chat-window {
        display: none;
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 380px;
        height: 550px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        flex-direction: column;
        overflow: hidden;
      }
      #bright-chat-window.open {
        display: flex;
      }
      #bright-chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #bright-chat-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      #bright-chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #bright-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .bright-chat-message {
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
      }
      .bright-chat-message.visitor {
        align-items: flex-end;
      }
      .bright-chat-message.agent,
      .bright-chat-message.bot {
        align-items: flex-start;
      }
      .bright-chat-message-bubble {
        max-width: 75%;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
      }
      .bright-chat-message.visitor .bright-chat-message-bubble {
        background: #667eea;
        color: white;
      }
      .bright-chat-message.agent .bright-chat-message-bubble,
      .bright-chat-message.bot .bright-chat-message-bubble {
        background: white;
        color: #333;
        border: 1px solid #e0e0e0;
      }
      .bright-chat-message-time {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
      }
      #bright-chat-form-container {
        padding: 16px;
        background: white;
        border-top: 1px solid #e0e0e0;
      }
      #bright-chat-intro {
        padding: 20px;
        background: white;
      }
      #bright-chat-intro h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
      }
      #bright-chat-intro p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: #666;
      }
      #bright-chat-intro input {
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        box-sizing: border-box;
      }
      #bright-chat-intro button {
        width: 100%;
        padding: 12px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      #bright-chat-input-form {
        display: flex;
        gap: 8px;
      }
      #bright-chat-input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
      }
      #bright-chat-send {
        padding: 10px 16px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
      }
      #bright-chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    </style>
    
    <div id="bright-chat-widget">
      <button id="bright-chat-button" aria-label="Open chat">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>
      
      <div id="bright-chat-window">
        <div id="bright-chat-header">
          <h3>Chat with Us</h3>
          <button id="bright-chat-close">&times;</button>
        </div>
        
        <div id="bright-chat-intro">
          <h4>👋 Welcome!</h4>
          <p>Fill in your details to start chatting</p>
          <input type="text" id="bright-chat-name" placeholder="Your name" required />
          <input type="email" id="bright-chat-email" placeholder="Your email" required />
          <input type="tel" id="bright-chat-phone" placeholder="Your phone (optional)" />
          <button id="bright-chat-start">Start Chat</button>
        </div>
        
        <div id="bright-chat-messages" style="display: none;"></div>
        
        <div id="bright-chat-form-container" style="display: none;">
          <form id="bright-chat-input-form">
            <input 
              type="text" 
              id="bright-chat-input" 
              placeholder="Type your message..." 
              autocomplete="off"
              required
            />
            <button type="submit" id="bright-chat-send">Send</button>
          </form>
        </div>
      </div>
    </div>
  \`;

  // Inject widget into page
  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  // Get elements
  const chatButton = document.getElementById('bright-chat-button');
  const chatWindow = document.getElementById('bright-chat-window');
  const chatClose = document.getElementById('bright-chat-close');
  const chatIntro = document.getElementById('bright-chat-intro');
  const chatMessages = document.getElementById('bright-chat-messages');
  const chatFormContainer = document.getElementById('bright-chat-form-container');
  const startButton = document.getElementById('bright-chat-start');
  const messageForm = document.getElementById('bright-chat-input-form');
  const messageInput = document.getElementById('bright-chat-input');

  // Toggle chat window
  chatButton.addEventListener('click', () => {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    if (isOpen && conversationId) {
      loadMessages();
      startPolling();
    }
  });

  chatClose.addEventListener('click', () => {
    isOpen = false;
    chatWindow.classList.remove('open');
    stopPolling();
  });

  // Start conversation
  startButton.addEventListener('click', async () => {
    const name = document.getElementById('bright-chat-name').value.trim();
    const email = document.getElementById('bright-chat-email').value.trim();
    const phone = document.getElementById('bright-chat-phone').value.trim();

    if (!name || !email) {
      alert('Please enter your name and email');
      return;
    }

    try {
      const response = await fetch(\`\${SUPABASE_URL}/rest/v1/chat_conversations\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          visitor_name: name,
          visitor_email: email,
          visitor_phone: phone || null,
          status: 'active'
        })
      });

      const data = await response.json();
      conversationId = data[0].id;
      localStorage.setItem('chat_conversation_id', conversationId);

      chatIntro.style.display = 'none';
      chatMessages.style.display = 'block';
      chatFormContainer.style.display = 'block';

      addMessage('bot', 'Thanks for reaching out! How can we help you today?');
      startPolling();
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start chat. Please try again.');
    }
  });

  // Send message
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    try {
      await fetch(\`\${SUPABASE_URL}/rest/v1/chat_messages\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_type: 'visitor',
          message: message
        })
      });

      addMessage('visitor', message);
      messageInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Add message to UI
  function addMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = \`bright-chat-message \${type}\`;
    
    const bubble = document.createElement('div');
    bubble.className = 'bright-chat-message-bubble';
    bubble.textContent = text;
    
    const time = document.createElement('div');
    time.className = 'bright-chat-message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(time);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Load messages from server
  async function loadMessages() {
    if (!conversationId) return;

    try {
      const response = await fetch(
        \`\${SUPABASE_URL}/rest/v1/chat_messages?conversation_id=eq.\${conversationId}&order=created_at.asc\`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY
          }
        }
      );

      const data = await response.json();
      chatMessages.innerHTML = '';
      
      data.forEach(msg => {
        addMessage(msg.sender_type, msg.message);
      });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  // Poll for new messages
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(loadMessages, 3000); // Poll every 3 seconds
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // If returning visitor with existing conversation
  if (conversationId) {
    chatIntro.style.display = 'none';
    chatMessages.style.display = 'block';
    chatFormContainer.style.display = 'block';
  }
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
