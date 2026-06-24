// ============================================
// GUIDEAU – Complete Script with Formatting
// ============================================

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const statusText = document.getElementById('statusText');
const statusLed = document.querySelector('.status-led');
const newChatBtn = document.getElementById('newChatBtn');
const suggestionChips = document.getElementById('suggestionChips');
const cvUpload = document.getElementById('cvUpload');
const uploadStatus = document.getElementById('uploadStatus');

const BACKEND_URL = 'http://localhost:8000';

// ============================================
// 1. FORMAT MESSAGE FUNCTION
// ============================================

function formatMessage(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italics (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Bullet points (• or -)
    formatted = formatted.replace(/^[•\-]\s/gm, '• ');
    formatted = formatted.replace(/\n[•\-]\s/g, '\n• ');
    
    // Convert bullet lines to list items
    formatted = formatted.replace(/• (.*?)(?=\n|$)/g, '<li>• $1</li>');
    
    // Wrap consecutive list items
    formatted = formatted.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    
    // Numbered lists
    formatted = formatted.replace(/(\d+)\. /g, '<li>$1. ');
    formatted = formatted.replace(/(<li>\d+\. .*?<\/li>)+/g, '<ol>$&</ol>');
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already
    if (!formatted.startsWith('<')) {
        formatted = `<p>${formatted}</p>`;
    }
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    
    return formatted;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// 2. MESSAGE FUNCTIONS
// ============================================

function addMessage(text, sender, timestamp) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender, 'fade-in');
    
    const avatar = sender === 'user' ? '👤' : '✦';
    const time = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Format bot messages, escape user messages
    const content = sender === 'bot' ? formatMessage(text) : escapeHtml(text);
    
    msgDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="message-bubble">
            <div class="message-content">${content}</div>
            <span class="timestamp">${time}</span>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
}

// ============================================
// 3. REST OF YOUR SCRIPT (same as before)
// ============================================

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot');
    typingDiv.id = 'typingMessage';
    typingDiv.innerHTML = `
        <div class="avatar">✦</div>
        <div class="message-bubble typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById('typingMessage');
    if (typing) typing.remove();
}

function setStatus(online, text) {
    statusText.innerText = text;
    if (online) {
        statusLed.style.background = '#96e072';
        statusLed.style.boxShadow = '0 0 10px rgba(150, 224, 114, 0.3)';
    } else {
        statusLed.style.background = '#d32f2f';
        statusLed.style.boxShadow = 'none';
    }
}

// ============================================
// 4. SEND MESSAGE
// ============================================

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    
    if (suggestionChips) suggestionChips.style.display = 'none';
    
    setStatus(true, 'Thinking...');
    showTyping();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `HTTP ${response.status}`);
        }

        const data = await response.json();
        removeTyping();
        addMessage(data.reply, 'bot', data.timestamp);
        setStatus(true, 'Ready');
    } catch (error) {
        removeTyping();
        if (error.name === 'AbortError') {
            addMessage('⏳ Request timed out. Please try again.', 'bot');
            setStatus(false, 'Timeout');
        } else {
            addMessage(`⚠️ ${error.message || 'Connection error. Is the backend running?'}`, 'bot');
            setStatus(false, 'Error');
        }
        console.error(error);
    }
}

// ============================================
// 5. EVENT LISTENERS
// ============================================

sendBtn.addEventListener('click', sendMessage);

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

// Suggestion chips
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const msg = chip.dataset.msg;
        if (msg) {
            userInput.value = msg;
            sendMessage();
        }
    });
});

// Topic buttons
document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const topic = btn.dataset.topic;
        if (topic) {
            userInput.value = topic;
            sendMessage();
        }
    });
});

// New Conversation
newChatBtn.addEventListener('click', () => {
    while (chatMessages.children.length > 2) {
        chatMessages.removeChild(chatMessages.lastChild);
    }
    if (suggestionChips) suggestionChips.style.display = 'flex';
    chatMessages.scrollTop = 0;
    setStatus(true, 'Ready');
    userInput.value = '';
});

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggle');
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggleBtn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    themeToggleBtn.querySelector('span:last-child').textContent = isDark ? 'Light mode' : 'Dark mode';
});

// CV Upload
cvUpload.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        uploadStatus.textContent = '❌ Only PDF files allowed';
        uploadStatus.className = 'upload-status error';
        this.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        uploadStatus.textContent = '❌ File too large (max 5MB)';
        uploadStatus.className = 'upload-status error';
        this.value = '';
        return;
    }

    uploadStatus.textContent = '⏳ Uploading...';
    uploadStatus.className = 'upload-status';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${BACKEND_URL}/upload-cv`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Upload failed');
        }

        const data = await response.json();
        uploadStatus.textContent = `✅ Uploaded successfully!`;
        uploadStatus.className = 'upload-status success';
    } catch (error) {
        uploadStatus.textContent = `❌ ${error.message}`;
        uploadStatus.className = 'upload-status error';
        console.error(error);
    }
});
// ============================================
// 7. ANALYZE CV
// ============================================

const analyzeCvBtn = document.getElementById('analyzeCvBtn');

analyzeCvBtn.addEventListener('click', async () => {
    if (analyzeCvBtn.disabled) return;
    
    analyzeCvBtn.disabled = true;
    analyzeCvBtn.textContent = '⏳ Analyzing...';
    setStatus(true, 'Analyzing CV...');
    
    addMessage('🔍 Analyzing your CV... This may take 10-15 seconds.', 'bot');
    showTyping();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(`${BACKEND_URL}/analyze-cv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `HTTP ${response.status}`);
        }

        const data = await response.json();
        removeTyping();
        addMessage(data.reply, 'bot', data.timestamp);
        setStatus(true, 'Ready');
        
    } catch (error) {
        removeTyping();
        if (error.name === 'AbortError') {
            addMessage('⏳ Analysis timed out. Please try again.', 'bot');
            setStatus(false, 'Timeout');
        } else {
            addMessage(`⚠️ ${error.message}`, 'bot');
            setStatus(false, 'Error');
        }
        console.error(error);
    }
    
    analyzeCvBtn.disabled = false;
    analyzeCvBtn.textContent = '🔍 Analyze My CV';
});

// ============================================
// 8. VIEW CV LIST
// ============================================

const viewCvListBtn = document.getElementById('viewCvListBtn');

viewCvListBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/cv-list`);
        const data = await response.json();
        
        if (data.files.length === 0) {
            addMessage('📭 No CVs uploaded yet. Upload a PDF first!', 'bot');
            return;
        }
        
        let message = '📁 **Uploaded CVs:**\n\n';
        data.files.forEach((file, index) => {
            message += `${index + 1}. ${file.filename} (${file.size_kb} KB)\n`;
        });
        message += `\nTotal: ${data.files.length} CV(s) uploaded.`;
        
        addMessage(message, 'bot');
    } catch (error) {
        addMessage(`⚠️ Error fetching CV list: ${error.message}`, 'bot');
        console.error(error);
    }
});