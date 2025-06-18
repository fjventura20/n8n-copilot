// chatbot/modules/chatbot-ui.js
// UI management module - handles chat interface with optimized rendering and enhanced history

// Use global chat memory and MAX_CONVERSATIONS
// Access via window object to avoid redeclaration issues

// Global notification system
window.showNotification = window.showNotification || function(message, type = 'info') {
  showMiniToast(message);
};

// Data manager class for chat persistence
class ChatDataManager {
  constructor() {
    this.currentMemory = window.chatMemory || [];
    this.history = [];
    this.historyKey = 'n8n-copilot-chat-history';
  }

  // Add message to current memory
  addMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        this.currentMemory.push({
          ...message,
          timestamp: new Date().toISOString()
        });
        window.chatMemory = this.currentMemory;
        window.dispatchEvent(new Event('chatMemoryUpdated'));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get current memory
  getCurrentMemory() {
    return this.currentMemory;
  }

  // Load from storage
  loadFromStorage() {
    return new Promise((resolve, reject) => {
      try {
        // Try to load from cookie first
        const cookieKey = 'n8n-copilot-chat-memory';
        const cookieData = getCookie(cookieKey);
        if (cookieData) {
          try {
            const parsedHistory = JSON.parse(cookieData);
            if (Array.isArray(parsedHistory)) {
              this.currentMemory = parsedHistory;
              window.chatMemory = this.currentMemory;
              resolve();
              return;
            }
          } catch (error) {
            console.error('Failed to parse chat history from cookie:', error);
          }
        }

        // Fallback to localStorage
        try {
          const localStorageData = localStorage.getItem('n8n-copilot-chat-memory');
          if (localStorageData) {
            const parsedHistory = JSON.parse(localStorageData);
            if (Array.isArray(parsedHistory)) {
              this.currentMemory = parsedHistory;
              window.chatMemory = this.currentMemory;
              // Save to cookie and clear localStorage to complete migration
              setCookie(cookieKey, localStorageData, 7);
              localStorage.removeItem('n8n-copilot-chat-memory');
              resolve();
              return;
            }
          }
        } catch (error) {
          console.error('Failed to load chat history from localStorage:', error);
        }

        resolve(); // No history found, but no error
      } catch (error) {
        reject(error);
      }
    });
  }

  // Save current conversation to history
  saveToHistory() {
    return new Promise((resolve, reject) => {
      try {
        const historyItem = {
          id: Date.now().toString(),
          title: `Conversation ${new Date().toLocaleDateString()}`,
          timestamp: new Date().toISOString(),
          messageCount: this.currentMemory.length,
          data: this.currentMemory
        };
        
        this.history.push(historyItem);
        this.saveHistoryToStorage();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Load conversation from history
  loadFromHistory(id) {
    return new Promise((resolve, reject) => {
      try {
        const historyItem = this.history.find(item => item.id === id);
        if (historyItem) {
          this.currentMemory = historyItem.data;
          window.chatMemory = this.currentMemory;
          window.dispatchEvent(new Event('chatMemoryUpdated'));
          resolve();
        } else {
          reject(new Error('History item not found'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get history
  getHistory() {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.history);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Delete history item
  deleteHistoryItem(id) {
    return new Promise((resolve, reject) => {
      try {
        this.history = this.history.filter(item => item.id !== id);
        this.saveHistoryToStorage();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Clear all data
  clearAllData() {
    return new Promise((resolve, reject) => {
      try {
        // Clear current memory and window object
        this.currentMemory = [];
        window.chatMemory = [];
        window.dispatchEvent(new Event('chatMemoryUpdated'));

        // Clear cookie
        document.cookie = 'n8n-copilot-chat-memory=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Save history to storage
  saveHistoryToStorage() {
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save chat history to storage:', error);
    }
  }

  // Load history from storage
  loadHistoryFromStorage() {
    try {
      const data = localStorage.getItem(this.historyKey);
      if (data) {
        this.history = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load chat history from storage:', error);
    }
  }
}

// Inject chat CSS if not already present
function injectChatStyles() {
  if (typeof window.sendToContentScript === 'function') {
    window.sendToContentScript({ type: 'getResourceURL', path: 'chatbot/chatbot.css' });
  } else {
    console.error('sendToContentScript function not available');
  }
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
    // If chat exists, just make sure it's visible
    showChatbot();
  } else {
    // If chat doesn't exist, create it
    if (isN8nPage()) {
      initChatbot();
    } else {
      console.log('Not an n8n page, chat not opened.');
      showMiniToast('This feature is for n8n pages only.');
    }
  }
}

// Inject chat HTML
function injectChatHtml(callback) {
  if (typeof window.sendToContentScript === 'function') {
    window.sendToContentScript({
      type: 'getChatHtml',
      callback: 'processChatHtml'
    });
  } else {
    console.error('sendToContentScript function not available');
  }

  // Store the callback to be called later
  window.processChatHtml = function(html) {
    const existingOverlay = document.getElementById('n8n-builder-chat');
    if (existingOverlay) existingOverlay.remove();

    // Handle case where extension context is invalidated
    if (!html) {
      console.warn('Chat HTML not available - extension context may be invalidated');
      showMiniToast('Extension needs to be reloaded. Please refresh the page.');
      if (callback) callback();
      return;
    }

    try {
      // Create a proper DOM element from the HTML string
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const chatElement = doc.getElementById('n8n-builder-chat');

      if (chatElement) {
        document.body.appendChild(chatElement);
        console.log('Chat HTML injected successfully');

        // Ensure the chat container is visible
        const chatContainer = document.getElementById('n8n-builder-chat');
        if (chatContainer) {
          chatContainer.style.display = 'flex';
          localStorage.setItem('n8n-copilot-chat-visible', 'true');
        }
      } else {
        console.error('Failed to parse chat HTML', html);
        showMiniToast('Failed to load chat interface');
      }
    } catch (error) {
      console.error('Error processing chat HTML:', error);
      showMiniToast('Error loading chat interface');
    }

    if (callback) callback();
  };
}

// Diffing algorithm for optimized UI updates
class MessageDiffer {
  constructor() {
    this.lastRenderedMessages = [];
  }

  // Calculate diff between current and new messages
  calculateDiff(newMessages) {
    const operations = [];
    const oldLength = this.lastRenderedMessages.length;
    const newLength = newMessages.length;

    // Simple append-only optimization for chat messages
    if (newLength > oldLength) {
      // Check if existing messages are unchanged
      let unchanged = true;
      for (let i = 0; i < oldLength; i++) {
        if (!this.messagesEqual(this.lastRenderedMessages[i], newMessages[i])) {
          unchanged = false;
          break;
        }
      }

      if (unchanged) {
        // Only append new messages
        for (let i = oldLength; i < newLength; i++) {
          operations.push({
            type: 'append',
            message: newMessages[i],
            index: i
          });
        }
      } else {
        // Full re-render needed
        operations.push({ type: 'full-render', messages: newMessages });
      }
    } else if (newLength < oldLength) {
      // Messages were removed - full re-render
      operations.push({ type: 'full-render', messages: newMessages });
    } else if (newLength === oldLength) {
      // Check for modifications
      let hasChanges = false;
      for (let i = 0; i < newLength; i++) {
        if (!this.messagesEqual(this.lastRenderedMessages[i], newMessages[i])) {
          hasChanges = true;
          operations.push({
            type: 'update',
            message: newMessages[i],
            index: i
          });
        }
      }

      if (!hasChanges) {
        // No changes needed
        return [];
      }
    }

    this.lastRenderedMessages = [...newMessages];
    return operations;
  }

  // Compare two messages for equality
  messagesEqual(msg1, msg2) {
    return msg1 && msg2 &&
           msg1.role === msg2.role &&
           msg1.content === msg2.content &&
           msg1.timestamp === msg2.timestamp;
  }

  // Reset differ state
  reset() {
    this.lastRenderedMessages = [];
  }
}

// Global message differ instance
window.messageDiffer = window.messageDiffer || new MessageDiffer();

// Optimized message rendering with diffing
function renderMessages(messages) {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return false;

  // Handle empty messages array
  if (messages.length === 0) {
    messagesArea.innerHTML = '';
    return true;
  }

  const operations = window.messageDiffer.calculateDiff(messages);

  if (operations.length === 0) {
    // No changes needed
    return true;
  }

  operations.forEach(op => {
    switch (op.type) {
      case 'append':
        appendMessageToUI(op.message);
        break;
      case 'update':
        updateMessageInUI(op.message, op.index);
        break;
      case 'full-render':
        fullRenderMessages(op.messages);
        break;
    }
  });

  // Auto-scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
  return true;
}

// Append single message to UI (optimized)
function appendMessageToUI(message) {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return false;

  const messageDiv = createMessageElement(message);
  messagesArea.appendChild(messageDiv);
  return true;
}

// Update existing message in UI
function updateMessageInUI(message, index) {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return false;

  const existingMessage = messagesArea.children[index];
  if (existingMessage) {
    const newMessageDiv = createMessageElement(message);
    messagesArea.replaceChild(newMessageDiv, existingMessage);
  }
  return true;
}

// Full re-render of all messages
function fullRenderMessages(messages) {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return false;

  messagesArea.innerHTML = '';
  messages.forEach(message => {
    const messageDiv = createMessageElement(message);
    messagesArea.appendChild(messageDiv);
  });
  return true;
}

// Create message DOM element
function createMessageElement(message) {
  const messageDiv = document.createElement('div');
  const sender = message.role === 'user' ? 'user' : 'assistant';
  messageDiv.className = `n8n-builder-message ${sender}-message`;
  messageDiv.innerHTML = `
    <div class="message-avatar ${sender}-avatar"></div>
    <div class="message-content">
      ${message.content}
    </div>
  `;
  return messageDiv;
}

// Add a message to the chat (enhanced with atomic operations)
function addMessage(sender, text, saveToMemory = true) {
  // DEBUG: Call chat history debugger if available
  if (window.chatHistoryDebugger) {
    window.chatHistoryDebugger.log('addMessage called', 'debug', {
      sender,
      textLength: text?.length || 0,
      saveToMemory
    });
  }
  
  // Data Operation: Save to memory if requested (atomic)
  if (saveToMemory && window.chatDataManager) {
    const message = {
      role: sender === 'user' ? 'user' : 'assistant',
      content: text
    };
    
    // Use atomic data manager for persistence
    window.chatDataManager.addMessage(message)
      .then(() => {
        console.log('Message saved to memory:', message);
        // Trigger UI update after successful save
        refreshChatUI();
      })
      .catch(error => {
        console.error('Failed to save message to memory:', error);
        showMiniToast('Failed to save message');
        
        // DEBUG: Log persistence error
        if (window.chatHistoryDebugger) {
          window.chatHistoryDebugger.log('Data persistence error', 'error', error.message);
        }
      });
  } else {
    // Direct UI update for non-persistent messages
    const message = {
      role: sender === 'user' ? 'user' : 'assistant',
      content: text,
      timestamp: new Date().toISOString()
    };
    appendMessageToUI(message);
  }
}

// Refresh chat UI from current memory state
function refreshChatUI() {
  if (window.chatDataManager) {
    const messages = window.chatDataManager.getCurrentMemory();
    renderMessages(messages);
  }
}

// Function to open the side panel
function openSidePanel() {
  const sidePanel = document.getElementById('n8n-builder-side-panel');
  if (sidePanel) {
    sidePanel.style.width = '300px'; // Adjust width as needed
  }
}

// Function to close the side panel
function closeSidePanel() {
  const sidePanel = document.getElementById('n8n-builder-side-panel');
  if (sidePanel) {
    sidePanel.style.width = '0';
  }
}

// Function to load chat history into the side panel
async function loadChatHistory() {
  const historyContainer = document.getElementById('n8n-builder-history-container');
  if (!historyContainer) return;

  // Clear existing history
  historyContainer.innerHTML = '';

  // Get chat history from data manager
  const history = await window.chatDataManager.getHistory();

  // Display each history item
  history.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'n8n-builder-history-item';
    historyItem.textContent = item.title;
    historyContainer.appendChild(historyItem);
  });
}

// Add event listeners for side panel controls
function setupSidePanelEventListeners() {
  const historyButton = document.querySelector('.n8n-builder-history-btn');
  const closeButton = document.getElementById('n8n-builder-close-side-panel');

  if (historyButton) {
    historyButton.addEventListener('click', () => {
      openSidePanel();
      loadChatHistory();
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeSidePanel();
    });
  }
}

// Function to show the chatbot
function showChatbot() {
  const chatContainer = document.getElementById('n8n-builder-chat');
  if (chatContainer) {
    chatContainer.style.display = 'flex';
    localStorage.setItem('n8n-copilot-chat-visible', 'true');
  }
}

// Function to hide the chatbot
function hideChatbot() {
  const chatContainer = document.getElementById('n8n-builder-chat');
  if (chatContainer) {
    chatContainer.style.display = 'none';
    localStorage.setItem('n8n-copilot-chat-visible', 'false');
  }
}

// Function to update n8n page indicator status
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

// Function to add status to header
function addStatusToHeader(isConnected) {
  const header = document.getElementById('n8n-builder-header');
  if (!header) return;
  
  const statusDiv = document.createElement('div');
  statusDiv.id = 'n8n-builder-connection-indicator';
  statusDiv.className = `n8n-builder-connection-indicator ${isConnected ? 'connected' : 'disconnected'}`;
  statusDiv.title = isConnected ? 'Connected' : 'Disconnected';
  header.appendChild(statusDiv);
}

// Function to restore chat history
async function restoreChatHistory() {
  console.log('Restoring chat history...');
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea || !window.chatDataManager) {
    console.log('No messages area or data manager found');
    return;
  }

  // Load history from data manager
  await window.chatDataManager.loadFromStorage();
  const messages = window.chatDataManager.getCurrentMemory();
  renderMessages(messages);
}

// Add event listeners to the close button
function setupEventListeners() {
  const closeButton = document.getElementById('n8n-builder-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideChatbot();
    });
  }

  const minimizeButton = document.getElementById('n8n-builder-minimize');
  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      // Implement minimize functionality here
      console.log('Minimize button clicked');
    });
  }

  const sendButton = document.getElementById('n8n-builder-send');
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      handleSendMessage();
    });
  }

  const inputElement = document.getElementById('n8n-builder-input');
  if (inputElement) {
    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent newline
        handleSendMessage();
      }
    });
  }

  const clearButton = document.getElementById('n8n-builder-clear');
  if (clearButton) {
    clearButton.addEventListener('click', async () => {
      console.log('Clear button clicked');
      window.clearButtonClicked = true;
      if (window.chatDataManager) {
        await window.chatDataManager.clearAllData();
        refreshChatUI();
      }
    });
  }
}

// Call showChatbot on initialization
showChatbot();

// Call setupSidePanelEventListeners after injecting chat HTML
function initChatbot() {
  injectChatHtml(() => {
    setupEventListeners();
    setupSidePanelEventListeners(); // Add this line
    
    // Initialize chatDataManager
    window.chatDataManager = window.chatDataManager || new ChatDataManager();

    // Restore chat history with enhanced system
    if (!window.clearButtonClicked) {
      setTimeout(async () => {
        try {
          await restoreChatHistory();
        } catch (error) {
          console.error('Error restoring chat history:', error);
        }
      }, 500);
    }
    
    // Test content script connection
    if (typeof testContentScriptConnection === 'function') {
      testContentScriptConnection();
    } else {
      console.warn('testContentScriptConnection is not defined');
    }
    
    // Add status to header
    if (typeof addStatusToHeader === 'function') {
      addStatusToHeader(true); // Assume connected for now, can be updated
    } else {
      console.warn('addStatusToHeader is not defined');
    }

    const chatVisible = localStorage.getItem('n8n-copilot-chat-visible');
    const chatContainer = document.getElementById('n8n-builder-chat');
    if (chatContainer) {
      chatContainer.style.display = chatVisible === 'true' ? 'flex' : 'none';
      console.log('Chat container is visible:', chatContainer.style.display === 'flex');
    } else {
      console.warn('Chat container not found');
    }
  });
}

// Function to show a loading indicator
function showLoadingIndicator() {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;

  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'n8n-builder-loading';
  loadingIndicator.className = 'n8n-builder-message assistant-message';
  loadingIndicator.innerHTML = `
    <div class="message-avatar assistant-avatar"></div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  messagesArea.appendChild(loadingIndicator);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Function to hide the loading indicator
function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('n8n-builder-loading');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Make functions globally accessible
window.updateN8nPageIndicator = updateN8nPageIndicator;
window.addStatusToHeader = addStatusToHeader;
window.restoreChatHistory = restoreChatHistory;
window.toggleChat = toggleChat;
window.addMessage = addMessage;
window.showMiniToast = showMiniToast;
window.showChatbot = showChatbot;
window.hideChatbot = hideChatbot;
window.openSidePanel = openSidePanel;
window.closeSidePanel = closeSidePanel;
window.loadChatHistory = loadChatHistory;
window.refreshChatUI = refreshChatUI;
window.showLoadingIndicator = showLoadingIndicator;
window.hideLoadingIndicator = hideLoadingIndicator;
