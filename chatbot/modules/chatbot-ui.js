// chatbot/modules/chatbot-ui.js

// Inject chat CSS if not already present
function injectChatStyles() {
  if (document.getElementById('n8n-builder-styles')) return;
  // Request the CSS URL from the content script
  sendToContentScript({ type: 'getResourceURL', path: 'chatbot/chatbot.css' });
}

function applyChatStyles(cssUrl) {
  const style = document.createElement('link');
  style.id = 'n8n-builder-styles';
  style.rel = 'stylesheet';
  style.type = 'text/css';
  style.href = cssUrl;
  document.head.appendChild(style);
}

// Inject the chat icon bubble
function injectChatIcon() {
  // Check if we have the resource URLs yet
  if (!window.extensionResources) {
    // If not, request them and return
    sendToContentScript({ type: 'getResourceURLs' });
    return;
  }

  // Remove existing icon if present
  const existingIcon = document.getElementById('n8n-builder-icon');
  if (existingIcon) existingIcon.remove();

  // Get the icon URL
  const iconUrl = getResourceURL('icons/chat-icon-48.png');

  // Create the chat icon
  const iconDiv = document.createElement('div');
  iconDiv.id = 'n8n-builder-icon';
  iconDiv.className = 'n8n-builder-chat-icon';
  iconDiv.innerHTML = `
    <img src="${iconUrl}" alt="n8n Co Pilot" />
  `;
  document.body.appendChild(iconDiv);

  // Add click event to the icon
  iconDiv.addEventListener('click', () => {
    toggleChat();
  });
}

// Create a mini toast notification
function showMiniToast(message) {
  const toast = document.createElement('div');
  toast.className = 'n8n-builder-mini-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }, 10);
}

// Toggle chat visibility
function toggleChat() {
  console.log('toggleChat called');
  const existingChat = document.getElementById('n8n-builder-chat');
  if (existingChat) {
    console.log('Removing existing chat');
    existingChat.remove();
  } else {
    if (isN8nPage()) {
      initChatbot();
    } else {
      console.log('Not an n8n page, chat not opened.');
      // Optionally, provide user feedback that this feature is only for n8n pages.
      showMiniToast('This feature is for n8n pages only.');
    }
  }
}

// Inject chat HTML
function injectChatHtml(callback) {
  // Request the HTML from the content script
  sendToContentScript({
    type: 'getChatHtml',
    callback: 'processChatHtml'
  });

  // Store the callback to be called later
  window.processChatHtml = function(html) {
    const existingOverlay = document.getElementById('n8n-builder-chat');
    if (existingOverlay) existingOverlay.remove();

    // Create a proper DOM element from the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();

    // Append the first child (should be the chat container) to the document body
    const chatElement = tempDiv.firstElementChild;
    if (chatElement) {
      document.body.appendChild(chatElement);
      console.log('Chat HTML injected successfully');
    } else {
      console.error('Failed to parse chat HTML', html);
    }

    if (callback) callback();
  };
}

// Add a message to the chat
function addMessage(sender, text) {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `n8n-builder-message ${sender}-message`;
  messageDiv.innerHTML = `
    <div class="message-avatar ${sender}-avatar"></div>
    <div class="message-content">
      ${text}
    </div>
  `;
  messagesArea.appendChild(messageDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;

  // Store message in memory
  chatMemory.push({
    role: sender === 'user' ? 'user' : 'assistant',
    content: text
  });
}

// Add loading indicator
function showLoadingIndicator() {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'n8n-builder-loading';
  loadingDiv.className = 'n8n-builder-message assistant-message loading';
  loadingDiv.innerHTML = `
    <div class="message-avatar assistant-avatar"></div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  messagesArea.appendChild(loadingDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Remove loading indicator
function removeLoadingIndicator() {
  const loadingIndicator = document.getElementById('n8n-builder-loading');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Update the n8n page connection indicator
function updateN8nPageIndicator(status = null) {
  const indicator = document.getElementById('n8n-builder-connection-indicator');
  if (!indicator) return;

  if (status) {
    indicator.className = `n8n-builder-connection-indicator ${status}`;
    indicator.title = status.charAt(0).toUpperCase() + status.slice(1);
  } else {
    indicator.className = 'n8n-builder-connection-indicator';
    indicator.title = 'Connection status';
  }
}

// Add connection status to the header
function addStatusToHeader(isConnected) {
  const header = document.getElementById('n8n-builder-header');
  if (!header) return;

  const statusDiv = document.createElement('div');
  statusDiv.id = 'n8n-builder-connection-indicator';
  statusDiv.className = `n8n-builder-connection-indicator ${isConnected ? 'connected' : 'disconnected'}`;
  statusDiv.title = isConnected ? 'Connected' : 'Disconnected';
  header.appendChild(statusDiv);
}

// Set up event listeners
function setupEventListeners() {
  const sendButton = document.getElementById('n8n-builder-send');
  if (sendButton) {
    sendButton.addEventListener('click', handleSendMessage);
  }

  const inputField = document.getElementById('n8n-builder-input');
  if (inputField) {
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  const closeButton = document.getElementById('n8n-builder-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const chat = document.getElementById('n8n-builder-chat');
      if (chat) chat.remove();
    });
  }

  const minimizeButton = document.getElementById('n8n-builder-minimize');
  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      const chat = document.getElementById('n8n-builder-chat');
      if (chat) chat.remove();
      // Show only the icon when minimized
    });
  }
}

// Initialize the chatbot
function initChatbot() {
  // Inject the chat HTML
  injectChatHtml(() => {
    // Set up event listeners after HTML is injected
    setupEventListeners();

    // Test content script connection
    testContentScriptConnection();

    // Add status indicator to header
    addStatusToHeader(true);
  });
}