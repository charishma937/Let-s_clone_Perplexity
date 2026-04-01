const textarea = document.querySelector('#chat-input');
const sendBtn = document.querySelector('#send-btn');
const mainContent = document.querySelector('.main-content');
const chatDisplay = document.querySelector('#chat-display');
const logo = document.querySelector('.logo');
const suggestions = document.querySelector('.suggestions');

const uploadBtn = document.querySelector('#upload-btn');
const fileInput = document.querySelector('#file-upload');
const uploadStatus = document.querySelector('#upload-status');

let chatHistory = [];

// Auto-resize textarea
if (textarea) {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Handle Enter key
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

// --- Upload Logic ---
if (uploadBtn) {
    uploadBtn.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        uploadStatus.style.display = 'inline-block';
        uploadStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

        try {
            const response = await fetch('http://localhost:8888/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                uploadStatus.innerHTML = `<i class="fa-solid fa-check"></i> ${file.name} ready`;
                uploadStatus.style.color = '#2b7a5a';
                
                // Add a notice in the chat
                appendMessage('ai', `I have successfully analyzed "${file.name}". You can now ask me questions about its content!`);
            } else {
                throw new Error(data.detail || 'Upload failed');
            }
        } catch (error) {
            uploadStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
            uploadStatus.style.color = '#c62828';
            appendMessage('ai', `Failed to upload PDF: ${error.message}`);
        }
    });
}

async function sendMessage() {
    const text = textarea.value.trim();
    if (!text) return;

    if (logo.style.display !== 'none') {
        logo.style.display = 'none';
        suggestions.style.display = 'none';
        chatDisplay.style.display = 'flex';
    }

    appendMessage('user', text);
    textarea.value = '';
    textarea.style.height = 'auto';

    const loadingId = appendLoading();

    try {
        const response = await fetch('http://localhost:8888/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: chatHistory
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        removeLoading(loadingId);

        if (data.status === 'success') {
            appendMessage('ai', data.response);
            chatHistory.push({ role: 'user', parts: text });
            chatHistory.push({ role: 'model', parts: data.response });
        } else {
            appendMessage('ai', 'Error: ' + (data.detail || 'Something went wrong'));
        }
    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', 'Error connecting to backend: ' + error.message);
    }
}

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.innerText = role === 'user' ? 'You' : 'Perplexity';
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerText = text;

    messageDiv.appendChild(label);
    messageDiv.appendChild(bubble);
    chatDisplay.appendChild(messageDiv);
    
    setTimeout(() => {
        mainContent.scrollTo({
            top: mainContent.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function appendLoading() {
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai';
    loadingDiv.id = loadingId;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.innerText = 'Perplexity';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `
        <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    loadingDiv.appendChild(label);
    loadingDiv.appendChild(bubble);
    chatDisplay.appendChild(loadingDiv);
    
    mainContent.scrollTo({
        top: mainContent.scrollHeight,
        behavior: 'smooth'
    });
    
    return loadingId;
}

function removeLoading(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}
