// chatbot/modules/chatbot-ui.js
  
  // Use global chat memory and MAX_CONVERSATIONS
  // Access via window object to avoid redeclaration issues
  
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
        // Optionally, provide user feedback that this feature is only for n8n pages.
        showMiniToast('This feature is for n8n pages only.');
      }
    }
  }
  
  // Inject chat HTML
  function injectChatHtml(callback) {
    // Request the HTML from the content script
    // Use the global sendToContentScript function
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
  
  // Add a message to the chat (UI operation only)
  function addMessage(sender, text, saveToMemory = true) {
    // DEBUG: Call chat history debugger if available
    if (window.chatHistoryDebugger) {
      window.chatHistoryDebugger.log('addMessage called', 'debug', {
        sender,
        textLength: text?.length || 0,
        saveToMemory
      });
    }
    
    // UI Operation: Add message to DOM
    const success = addMessageToUI(sender, text);
    if (!success) {
      return;
    }
    
    // Data Operation: Save to memory if requested
    if (saveToMemory && window.chatDataManager) {
      const message = {
        role: sender === 'user' ? 'user' : 'assistant',
        content: text
      };
      
      // Use atomic data manager for persistence
      try {
        window.chatDataManager.addMessage(message)
          .then(() => {
            console.log('Message saved to memory:', message);
          })
          .catch(error => {
            console.error('Failed to save message to memory:', error);
            
            // DEBUG: Log persistence error
            if (window.chatHistoryDebugger) {
              window.chatHistoryDebugger.log('Data persistence error', 'error', error.message);
            }
          });
      } catch (e) {
        console.error('Error in addMessage:', e);
      }
    }
  }
  
  // Separated UI operation for adding message to DOM
  function addMessageToUI(sender, text) {
    const messagesArea = document.getElementById('n8n-builder-messages');
    if (!messagesArea) {
      // DEBUG: Log missing messages area
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('Messages area not found', 'error');
      }
      return false;
    }
    
    // DEBUG: Log DOM state before adding message
    if (window.chatHistoryDebugger) {
      window.chatHistoryDebugger.log('DOM state before message add', 'debug', {
        existingChildren: messagesArea.children.length,
        scrollHeight: messagesArea.scrollHeight,
        scrollTop: messagesArea.scrollTop
      });
    }
    
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
    
    // DEBUG: Log DOM state after adding message
    if (window.chatHistoryDebugger) {
      window.chatHistoryDebugger.log('DOM state after message add', 'debug', {
        newChildren: messagesArea.children.length,
        scrollHeight: messagesArea.scrollHeight,
        scrollTop: messagesArea.scrollTop
      });
    }
    
    return true;
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
    
    // Add clear button functionality
    const clearButton = document.getElementById('n8n-builder-clear');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        console.log('Clear button clicked - clearing UI only');
        
        // Clear displayed messages (UI only)
        const messagesArea = document.getElementById('n8n-builder-messages');
        if (messagesArea) {
          messagesArea.innerHTML = '';
          console.log('Chat interface cleared');
        }
        
        // NOTE: Chat history is preserved in storage for conversation continuity
        // Users can access previous conversations via the history feature
        console.log('Chat interface cleared. History preserved for continuity.');
      });
    }
  }
  
  // Initialize the chatbot
  function initChatbot() {
    // Inject the chat HTML
    injectChatHtml(() => {
      // Set up event listeners after HTML is injected
      setupEventListeners();
      
      // Delay restoring chat history to allow localStorage to initialize
      setTimeout(() => {
        restoreChatHistory();
      }, 500);
      
      // Test content script connection
      testContentScriptConnection();
      
      // Add status indicator to header
      addStatusToHeader(true);
      
      // Initialize chat history functionality
      initChatHistory();
    });
  }
  
  // Load chat history from unified storage
  function loadChatHistoryFromStorage() {
    console.log('Loading chat history from unified storage...');
    
    // Check if getCookie is available in window scope
    if (typeof window.getCookie === 'function') {
      const cookieKey = 'n8n-copilot-chat-memory';
      const stored = window.getCookie(cookieKey);
      if (stored) {
        try {
          const parsedHistory = JSON.parse(stored);
          if (Array.isArray(parsedHistory)) {
            window.chatMemory = parsedHistory;
            console.log('Loaded chat history from unified storage:', window.chatMemory.length, 'messages');
            return true;
          } else {
            console.error('Invalid chat history format in unified storage');
            return false;
          }
        } catch (error) {
          console.error('Failed to parse chat history from unified storage:', error);
          return false;
        }