const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const statusText = document.getElementById('statusText');
const statusLed = document.querySelector('.status-led');
const newChatBtn = document.getElementById('newChatBtn');

const BACKEND_URL = 'http://localhost:8000/chat';

function addMessage(text, sender, isTypingPlaceholder = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    if (!isTypingPlaceholder) msgDiv.classList.add('fade-in');
    
    const avatar = sender === 'user' ? '👤' : '🤖';
    const avatarClass = sender === 'user' ? 'user-avatar' : 'bot-avatar';
    
    if (isTypingPlaceholder) {
        msgDiv.innerHTML = `
            <div class="avatar ${avatarClass}">${avatar}</div>
            <div class="message-bubble typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        msgDiv.id = 'typingMessage';
    } else {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgDiv.innerHTML = `
            <div class="avatar ${avatarClass}">${avatar}</div>
            <div class="message-bubble">
                <p>${escapeHtml(text)}</p>
                <span class="timestamp">${time}</span>
            </div>
        `;
    }
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

function removeTyping() {
    const typing = document.getElementById('typingMessage');
    if (typing) typing.remove();
}

function setStatus(online, text) {
    statusText.innerText = text;
    if (online) {
        statusLed.style.background = '#22c55e';
        statusLed.style.boxShadow = '0 0 6px #22c55e';
    } else {
        statusLed.style.background = '#ef4444';
        statusLed.style.boxShadow = 'none';
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    
    setStatus(true, 'AI thinking...');
    addMessage('', 'bot', true); // typing indicator

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HTTP ${response.status}: ${err}`);
        }
        const data = await response.json();
        removeTyping();
        addMessage(data.reply, 'bot');
        setStatus(true, 'Ready');
    } catch (error) {
        removeTyping();
        addMessage(`⚠️ Error: ${error.message}. Make sure backend is running (uvicorn) and .env is set.`, 'bot');
        setStatus(false, 'Connection error');
        console.error(error);
    }
}

// reset conversation (clear messages, keep first bot msg)
function newConversation() {
    while (chatMessages.children.length > 1) {
        chatMessages.removeChild(chatMessages.lastChild);
    }
    // optional: re-add greeting (the existing first message stays)
    chatMessages.scrollTop = 0;
    setStatus(true, 'Ready');
}

sendBtn.addEventListener('click', sendMessage);
newChatBtn.addEventListener('click', newConversation);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

// Theme toggle (dark/light)
const themeToggleBtn = document.getElementById('themeToggle');
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggleBtn.querySelector('.theme-icon').textContent = isLight ? '☀️' : '🌙';
    themeToggleBtn.querySelector('span:last-child').textContent = isLight ? 'Light mode' : 'Dark mode';
});