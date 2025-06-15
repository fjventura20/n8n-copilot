// chatbot/modules/chatbot-data.js
// Data management module - handles all chat memory operations atomically with IndexedDB

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

// Atomic storage operations with race condition prevention and IndexedDB
class ChatDataManager {
  constructor() {
    this.isOperationInProgress = false;
    this.operationQueue = [];
    this.maxConversations = window.MAX_CONVERSATIONS || 100;
    this.maxHistoryItems = 50;
    this.db = null;
    this.dbInitialized = false;
    this.initializeDatabase();
  }

  // Initialize IndexedDB for persistent storage
  async initializeDatabase() {
    if (this.dbInitialized) return;
    
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open('n8n-copilot-chat-memory', 2);

      openRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create conversations store for current chat
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Create history store for saved conversations
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('title', 'title', { unique: false });
        }
      };

      openRequest.onerror = () => {
        console.error('Failed to open IndexedDB:', openRequest.error);
        this.showStorageError('Failed to initialize storage');
        reject(openRequest.error);
      };

      openRequest.onsuccess = () => {
        this.db = openRequest.result;
        this.dbInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };
    });
  }

  // Show user-friendly storage error notifications
  showStorageError(message) {
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      console.error('Storage Error:', message);
    }
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

  // Atomic message addition with IndexedDB persistence
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

      // Persist to IndexedDB and fallback storage
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

  // Save current conversation to history
  async saveToHistory(title = null) {
    return this.executeAtomically(async () => {
      if (!window.chatMemory || window.chatMemory.length === 0) {
        throw new Error('No conversation to save');
      }

      await this.initializeDatabase();

      const historyItem = {
        title: title || this.generateConversationTitle(),
        messages: [...window.chatMemory],
        timestamp: new Date().toISOString(),
        messageCount: window.chatMemory.length
      };

      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      
      try {
        await new Promise((resolve, reject) => {
          const request = store.add(historyItem);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // Prune old history items
        await this.pruneHistory();

        return historyItem;
      } catch (error) {
        this.showStorageError('Failed to save conversation to history');
        throw error;
      }
    });
  }

  // Load conversation from history
  async loadFromHistory(historyId) {
    return this.executeAtomically(async () => {
      await this.initializeDatabase();

      const transaction = this.db.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');

      try {
        const historyItem = await new Promise((resolve, reject) => {
          const request = store.get(historyId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        if (!historyItem) {
          throw new Error('History item not found');
        }

        // Load the conversation
        await this.loadConversation(historyItem.messages);
        
        return historyItem;
      } catch (error) {
        this.showStorageError('Failed to load conversation from history');
        throw error;
      }
    });
  }

  // Get all history items
  async getHistory() {
    await this.initializeDatabase();

    const transaction = this.db.transaction(['history'], 'readonly');
    const store = transaction.objectStore('history');
    const index = store.index('timestamp');

    try {
      return await new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          const items = request.result.reverse(); // Most recent first
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.showStorageError('Failed to load conversation history');
      return [];
    }
  }

  // Delete history item
  async deleteFromHistory(historyId) {
    return this.executeAtomically(async () => {
      await this.initializeDatabase();

      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');

      try {
        await new Promise((resolve, reject) => {
          const request = store.delete(historyId);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        return true;
      } catch (error) {
        this.showStorageError('Failed to delete conversation from history');
        throw error;
      }
    });
  }

  // Prune old history items to maintain size limits
  async pruneHistory() {
    const transaction = this.db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    const index = store.index('timestamp');

    try {
      const allItems = await new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (allItems.length > this.maxHistoryItems) {
        // Sort by timestamp and remove oldest items
        allItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const itemsToDelete = allItems.slice(0, allItems.length - this.maxHistoryItems);

        for (const item of itemsToDelete) {
          await new Promise((resolve, reject) => {
            const request = store.delete(item.id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
    } catch (error) {
      console.warn('Failed to prune history:', error);
    }
  }

  // Generate conversation title from first user message
  generateConversationTitle() {
    if (!window.chatMemory || window.chatMemory.length === 0) {
      return 'Empty Conversation';
    }

    const firstUserMessage = window.chatMemory.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content.substring(0, 50);
      return title.length < firstUserMessage.content.length ? title + '...' : title;
    }

    return `Conversation ${new Date().toLocaleDateString()}`;
  }

  // Atomic storage persistence with IndexedDB primary and cookie fallback
  async persistToStorage() {
    return this.executeAtomically(async () => {
      if (!window.chatMemory) {
        throw new Error('No chat memory to persist');
      }

      // Validate all messages before persisting
      validateConversation(window.chatMemory);

      try {
        // Primary storage: IndexedDB
        await this.initializeDatabase();
        
        const conversationData = {
          id: 'current',
          messages: window.chatMemory,
          timestamp: new Date().toISOString()
        };

        const transaction = this.db.transaction(['conversations'], 'readwrite');
        const store = transaction.objectStore('conversations');
        
        await new Promise((resolve, reject) => {
          const request = store.put(conversationData);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

      } catch (error) {
        console.warn('IndexedDB persistence failed, falling back to cookie:', error);
        this.showStorageError('Storage warning: Using fallback storage');
      }

      // Fallback storage: cookies
      try {
        const serializedData = JSON.stringify(window.chatMemory);
        if (typeof window.setCookie === 'function') {
          window.setCookie('n8n-copilot-chat-memory', serializedData, 7);
        }
      } catch (error) {
        console.error('Cookie fallback failed:', error);
        this.showStorageError('Failed to save conversation');
        throw error;
      }

      // Debug logging
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('Data persisted atomically', 'debug', {
          messagesCount: window.chatMemory.length,
          storage: 'IndexedDB + Cookie'
        });
      }

      return true;
    });
  }

  // Atomic storage loading with IndexedDB primary and cookie fallback
  async loadFromStorage() {
    return this.executeAtomically(async () => {
      // Try IndexedDB first (primary storage)
      try {
        await this.initializeDatabase();
        
        const transaction = this.db.transaction(['conversations'], 'readonly');
        const store = transaction.objectStore('conversations');
        
        const conversationData = await new Promise((resolve, reject) => {
          const request = store.get('current');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        if (conversationData && conversationData.messages) {
          validateConversation(conversationData.messages);
          window.chatMemory = conversationData.messages;
          
          // Debug logging
          if (window.chatHistoryDebugger) {
            window.chatHistoryDebugger.log('Data loaded from IndexedDB', 'debug', {
              messagesCount: window.chatMemory.length
            });
          }
          
          return window.chatMemory;
        }
      } catch (error) {
        console.warn('IndexedDB loading failed, trying cookie fallback:', error);
      }

      // Fallback to cookies
      if (typeof window.getCookie === 'function') {
        const cookieData = window.getCookie('n8n-copilot-chat-memory');
        
        if (cookieData) {
          try {
            const parsedData = JSON.parse(cookieData);
            validateConversation(parsedData);
            window.chatMemory = parsedData;
            
            // Migrate to IndexedDB
            try {
              await this.persistToStorage();
            } catch (migrationError) {
              console.warn('Failed to migrate to IndexedDB:', migrationError);
            }
            
            // Debug logging
            if (window.chatHistoryDebugger) {
              window.chatHistoryDebugger.log('Data loaded from cookie', 'debug', {
                messagesCount: window.chatMemory.length
              });
            }
            
            return window.chatMemory;
          } catch (error) {
            console.error('Failed to parse chat history from cookie:', error);
            this.showStorageError('Storage data corruption detected');
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
          
          // Migrate to IndexedDB and clean up localStorage
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
        this.showStorageError('Migration from old storage failed');
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
      
      // Clear from IndexedDB
      try {
        await this.initializeDatabase();
        const transaction = this.db.transaction(['conversations'], 'readwrite');
        const store = transaction.objectStore('conversations');
        
        await new Promise((resolve, reject) => {
          const request = store.delete('current');
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
      
      // Clear from cookies
      if (typeof window.setCookie === 'function') {
        window.setCookie('n8n-copilot-chat-memory', '', -1); // Expire cookie
      }
      
      // Clear from localStorage
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

  // Clear all history
  async clearHistory() {
    return this.executeAtomically(async () => {
      try {
        await this.initializeDatabase();
        const transaction = this.db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        return true;
      } catch (error) {
        this.showStorageError('Failed to clear conversation history');
        throw error;
      }
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