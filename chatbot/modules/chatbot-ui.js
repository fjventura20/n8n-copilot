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

        // Clear localStorage
        localStorage.removeItem('n8n-copilot-chat-memory');

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
    console.log('Removing existing chat');
    existingChat.remove();
  } else {
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
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html.trim();
      
      // Append the first child (should be the chat container) to the document body
      const chatElement = tempDiv.firstElementChild;
      if (chatElement) {
        document.body.appendChild(chatElement);
        console.log('Chat HTML injected successfully');
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
  console.log('Refreshing chat UI');
  if (window.chatDataManager) {
    const currentMemory = window.chatDataManager.getCurrentMemory();
    console.log('Current memory:', currentMemory);
    renderMessages(currentMemory);
  } else {
    console.log('chatDataManager is not available');
  }
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
    });
  }
  
  // Enhanced clear button functionality
  const clearButton = document.getElementById('n8n-builder-clear');
  if (clearButton) {
   clearButton.addEventListener('click', async () => {
      console.log('Clear button clicked - clearing current conversation');
      window.clearButtonClicked = true; // Set flag to prevent history restore

      try {
        // Save current conversation to history before clearing
        if (window.chatDataManager) {
           const currentMemory = window.chatDataManager.getCurrentMemory();
           if (currentMemory.length > 0) {
             await window.chatDataManager.saveToHistory();
             showMiniToast('Conversation saved to history');
           }

           // Clear current conversation
           await window.chatDataManager.clearAllData();
           window.messageDiffer.reset();
           refreshChatUI();
           showMiniToast('Conversation cleared');
         }
       } catch (error) {
         console.error('Failed to clear conversation:', error);
         showMiniToast('Failed to clear conversation');
       } finally {
         // Ensure the flag is set for at least a short time to prevent immediate restore
         setTimeout(() => {
           window.clearButtonClicked = false;
         }, 1000); // Keep flag set for 1 second
       }
     });
   }

  // Enhanced history button functionality
  const historyButton = document.getElementById('n8n-builder-history');
  if (historyButton) {
    historyButton.addEventListener('click', async () => {
      console.log('History button clicked - displaying enhanced chat history');
      await initEnhancedChatHistory();
      const historyModal = document.getElementById('n8n-builder-history-modal');
      if (historyModal) {
        historyModal.style.display = 'block';
      }
    });
  }

  // Add close history button functionality
  const closeHistoryButton = document.getElementById('n8n-builder-close-history');
  if (closeHistoryButton) {
    closeHistoryButton.addEventListener('click', () => {
      const historyModal = document.getElementById('n8n-builder-history-modal');
      if (historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }
}

// Enhanced chat history initialization
async function initEnhancedChatHistory() {
  console.log('Initializing enhanced chat history modal...');
  const historyList = document.getElementById('n8n-builder-history-list');
  const historyModal = document.getElementById('n8n-builder-history-modal');

  if (!historyList || !historyModal) return;

  try {
    // Get history from data manager
    const historyItems = window.chatDataManager ? 
      await window.chatDataManager.getHistory() : [];

    // Clear and populate history list
    historyList.innerHTML = '';
    
    if (historyItems.length > 0) {
      historyItems.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'history-item';
        listItem.innerHTML = `
          <div class="history-item-header">
            <span class="history-title">${item.title}</span>
            <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
          <div class="history-meta">
            ${item.messageCount} messages
          </div>
          <div class="history-actions">
            <button class="restore-btn" data-id="${item.id}">Restore</button>
            <button class="delete-btn" data-id="${item.id}">Delete</button>
          </div>
        `;
        
        // Add restore functionality
        const restoreBtn = listItem.querySelector('.restore-btn');
        restoreBtn.addEventListener('click', async () => {
          try {
            await window.chatDataManager.loadFromHistory(item.id);
            window.messageDiffer.reset();
            refreshChatUI();
            historyModal.style.display = 'none';
            showMiniToast('Conversation restored');
          } catch (error) {
            console.error('Failed to restore conversation:', error);
            showMiniToast('Failed to restore conversation');
          }
        });

        // Add delete functionality
        const deleteBtn = listItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async () => {
          try {
            await window.chatDataManager.deleteHistoryItem(item.id);
            showMiniToast('History item deleted');
            initEnhancedChatHistory(); // Refresh history list
          } catch (error) {
            console.error('Failed to delete history item:', error);
            showMiniToast('Failed to delete history item');
          }
        });
      });
    } else {
      historyList.innerHTML = '<p>No chat history available.</p>';
    }
  } catch (error) {
    console.error('Failed to initialize chat history:', error);
    historyList.innerHTML = '<p>Failed to load chat history.</p>';
  }
}

// Restore chat history to the UI (enhanced with diffing)
async function restoreChatHistory() {
  console.log('Restoring chat history to UI...');

  // Check if clear button was clicked
  if (window.clearButtonClicked) {
    console.log('Clear button was clicked, skipping restore chat history');
    window.clearButtonClicked = false; // Reset the flag
    return;
  }

  try {
    if (window.chatDataManager) {
      // Load from storage using data manager
      await window.chatDataManager.loadFromStorage();
      const currentMemory = window.chatDataManager.getCurrentMemory();

      // Reset differ and render messages
      window.messageDiffer.reset();
      renderMessages(currentMemory);

      console.log(`Restored ${currentMemory.length} messages using enhanced system.`);
    }
  } catch (error) {
    console.error('Failed to restore chat history:', error);
    showMiniToast('Failed to restore chat history');
  } finally {
    // Ensure the flag is reset even if there's an error
    window.clearButtonClicked = false;
  }
}

// Initialize the chatbot
function initChatbot() {
  // Inject the chat HTML
  injectChatHtml(() => {
    // Set up event listeners after HTML is injected
    setupEventListeners();
    
    // Initialize chatDataManager
    window.chatDataManager = window.chatDataManager || new ChatDataManager();
// Restore chat history with enhanced system
if (!window.clearButtonClicked) {
  setTimeout(async () => {
    await restoreChatHistory();
  }, 500);
}

    
    // Test content script connection
    testContentScriptConnection();
    
    // Add status indicator to header
    addStatusToHeader(true);
  });
}

// Legacy compatibility function
function loadChatHistoryFromStorage() {
  console.log('Legacy loadChatHistoryFromStorage called - using enhanced system');
  return restoreChatHistory();
}

// Inject the chat icon bubble
function injectChatIcon() {
  // Check if we have the resource URLs yet
  if (!window.extensionResources) {
    // If not, request them and return
    // Use the global sendToContentScript function
    if (typeof window.sendToContentScript === 'function') {
      window.sendToContentScript({ type: 'getResourceURLs' });
    } else {
      console.error('sendToContentScript function not available');
    }
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