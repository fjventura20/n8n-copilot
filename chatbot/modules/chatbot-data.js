// chatbot/modules/chatbot-data.js
// Data management module - handles all chat memory operations atomically

// Data validation utilities
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message: must be an object');
  }
  
  if (!message.role || !['user', 'assistant'].includes(message.role)) {
    throw new Error('Invalid message role: must be "user" or "assistant"');
  }
  
  if (!message.content || typeof message.content !== 'string') {
    throw new Error('Invalid message content: must be a non-empty string');
  }
  
  return true;
}

function validateConversation(conversation) {
  if (!Array.isArray(conversation)) {
    throw new Error('Invalid conversation: must be an array');
  }
  
  conversation.forEach((message, index) => {
    try {
      validateMessage(message);
    } catch (error) {
      throw new Error(`Invalid message at index ${index}: ${error.message}`);
    }
  });
  
  return true;
}

// Atomic storage operations with race condition prevention
class ChatDataManager {
  constructor() {
    this.isOperationInProgress = false;
    this.operationQueue = [];
    this.maxConversations = window.MAX_CONVERSATIONS || 5;
  }

  // Queue operations to prevent race conditions
  async executeAtomically(operation) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isOperationInProgress || this.operationQueue.length === 0) {
      return;
    }

    this.isOperationInProgress = true;
    const { operation, resolve, reject } = this.operationQueue.shift();

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isOperationInProgress = false;
      // Process next operation in queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  // Atomic message addition
  async addMessage(message) {
    return this.executeAtomically(async () => {
      // Validate message before adding
      validateMessage(message);

      // Ensure chat memory exists
      if (!window.chatMemory) {
        window.chatMemory = [];
      }

      // Create a deep copy to avoid reference issues
      const messageCopy = {
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString()
      };

      // Add message to memory
      window.chatMemory.push(messageCopy);

      // Limit memory size
      if (window.chatMemory.length > this.maxConversations) {
        window.chatMemory = window.chatMemory.slice(-this.maxConversations);
      }

      // Persist to storage
      await this.persistToStorage();

      return messageCopy;
    });
  }

  // Atomic conversation loading
  async loadConversation(conversation) {
    return this.executeAtomically(async () => {
      // Validate conversation before loading
      validateConversation(conversation);

      // Create a deep copy to avoid reference issues
      const conversationCopy = conversation.map(message => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString()
      }));

      // Replace current memory with conversation
      window.chatMemory = conversationCopy;

      // Persist to storage
      await this.persistToStorage();

      return conversationCopy;
    });
  }

  // Atomic conversation appending (for switching without data loss)
  async appendConversation(conversation) {
    return this.executeAtomically(async () => {
      // Validate conversation before appending
      validateConversation(conversation);

      // Ensure chat memory exists
      if (!window.chatMemory) {
        window.chatMemory = [];
      }

      // Create deep copies and append
      const conversationCopy = conversation.map(message => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString()
      }));

      window.chatMemory = [...window.chatMemory, ...conversationCopy];

      // Limit memory size
      if (window.chatMemory.length > this.maxConversations) {
        window.chatMemory = window.chatMemory.slice(-this.maxConversations);
      }

      // Persist to storage
      await this.persistToStorage();

      return window.chatMemory;
    });
  }

  // Atomic storage persistence
  async persistToStorage() {
    return this.executeAtomically(async () => {
      if (!window.chatMemory) {
        throw new Error('No chat memory to persist');
      }

      // Validate all messages before persisting
      validateConversation(window.chatMemory);

      const serializedData = JSON.stringify(window.chatMemory);
      
      // Primary storage: cookies
      if (typeof window.setCookie === 'function') {
        window.setCookie('n8n-copilot-chat-memory', serializedData, 7);
      } else {
        throw new Error('setCookie function not available');
      }

      // Debug logging
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('Data persisted atomically', 'debug', {
          messagesCount: window.chatMemory.length,
          dataSize: serializedData.length
        });
      }

      return true;
    });
  }

  // Atomic storage loading
  async loadFromStorage() {
    return this.executeAtomically(async () => {
      // Try cookies first (primary storage)
      if (typeof window.getCookie === 'function') {
        const cookieData = window.getCookie('n8n-copilot-chat-memory');
        
        if (cookieData) {
          try {
            const parsedData = JSON.parse(cookieData);
            validateConversation(parsedData);
            window.chatMemory = parsedData;
            
            // Debug logging
            if (window.chatHistoryDebugger) {
              window.chatHistoryDebugger.log('Data loaded from storage', 'debug', {
                messagesCount: window.chatMemory.length,
                source: 'cookie'
              });
            }
            
            return window.chatMemory;
          } catch (error) {
            console.error('Failed to parse chat history from cookie:', error);
            throw new Error(`Storage data corruption: ${error.message}`);
          }
        }
      }

      // Fallback to localStorage for migration
      try {
        const localStorageData = localStorage.getItem('n8n-copilot-chat-memory');
        
        if (localStorageData) {
          const parsedData = JSON.parse(localStorageData);
          validateConversation(parsedData);
          window.chatMemory = parsedData;
          
          // Migrate to cookie and clean up localStorage
          await this.persistToStorage();
          localStorage.removeItem('n8n-copilot-chat-memory');
          
          // Debug logging
          if (window.chatHistoryDebugger) {
            window.chatHistoryDebugger.log('Data migrated from localStorage', 'debug', {
              messagesCount: window.chatMemory.length
            });
          }
          
          return window.chatMemory;
        }
      } catch (error) {
        console.error('Failed to migrate from localStorage:', error);
        throw new Error(`Migration failed: ${error.message}`);
      }

      // No data found
      window.chatMemory = [];
      return window.chatMemory;
    });
  }

  // Clear all data atomically
  async clearAllData() {
    return this.executeAtomically(async () => {
      window.chatMemory = [];
      
      // Clear from all storage locations
      if (typeof window.setCookie === 'function') {
        window.setCookie('n8n-copilot-chat-memory', '', -1); // Expire cookie
      }
      
      try {
        localStorage.removeItem('n8n-copilot-chat-memory');
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }

      // Debug logging
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('All data cleared atomically', 'debug');
      }

      return true;
    });
  }

  // Get current memory state (read-only)
  getCurrentMemory() {
    if (!window.chatMemory) {
      return [];
    }
    
    // Return a deep copy to prevent external modifications
    return window.chatMemory.map(message => ({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    }));
  }

  // Get memory statistics
  getMemoryStats() {
    const memory = this.getCurrentMemory();
    return {
      totalMessages: memory.length,
      userMessages: memory.filter(m => m.role === 'user').length,
      assistantMessages: memory.filter(m => m.role === 'assistant').length,
      isAtCapacity: memory.length >= this.maxConversations,
      lastMessageTime: memory.length > 0 ? memory[memory.length - 1].timestamp : null
    };
  }
}

// Create global instance
window.chatDataManager = window.chatDataManager || new ChatDataManager();

// Export functions for backward compatibility
window.validateMessage = validateMessage;
window.validateConversation = validateConversation;