// chatbot/debug_chat_history.js
// Comprehensive Chat History Debugging Instrumentation

/**
 * Debug Chat History - Comprehensive debugging for chat history functionality
 * 
 * This module provides detailed logging and state inspection for:
 * 1. Chat history loading and storage operations
 * 2. UI rendering and DOM manipulation
 * 3. Data persistence across storage mechanisms
 * 4. Memory management and conversation limits
 */

class ChatHistoryDebugger {
  constructor() {
    this.debugPrefix = '[CHAT_HISTORY_DEBUG]';
    this.logLevel = 'verbose'; // 'minimal', 'standard', 'verbose'
    this.startTime = Date.now();
    this.operationCounter = 0;
    
    // Initialize debug state tracking
    this.debugState = {
      storageOperations: [],
      uiOperations: [],
      memoryOperations: [],
      errors: [],
      warnings: []
    };
    
    this.log('ChatHistoryDebugger initialized', 'info');
  }

  // Core logging method with timestamp and operation counter
  log(message, level = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    const operation = ++this.operationCounter;
    
    const logEntry = {
      timestamp,
      elapsed,
      operation,
      level,
      message,
      data
    };

    // Store in debug state
    if (level === 'error') {
      this.debugState.errors.push(logEntry);
    } else if (level === 'warn') {
      this.debugState.warnings.push(logEntry);
    }

    // Console output with formatting
    const prefix = `${this.debugPrefix} [${operation}] [${elapsed}ms]`;
    const fullMessage = `${prefix} ${message}`;
    
    switch (level) {
      case 'error':
        console.error(fullMessage, data || '');
        break;
      case 'warn':
        console.warn(fullMessage, data || '');
        break;
      case 'info':
        console.info(fullMessage, data || '');
        break;
      case 'debug':
        if (this.logLevel === 'verbose') {
          console.debug(fullMessage, data || '');
        }
        break;
      default:
        console.log(fullMessage, data || '');
    }
  }

  // Debug chat history loading process
  debugChatHistoryLoading() {
    this.log('=== CHAT HISTORY LOADING DEBUG START ===', 'info');
    
    // 1. Check global variables and window state
    this.log('Step 1: Checking global variables', 'info');
    this.log('window.chatMemory exists:', 'debug', !!window.chatMemory);
    this.log('window.chatMemory type:', 'debug', typeof window.chatMemory);
    this.log('window.chatMemory length:', 'debug', window.chatMemory?.length || 0);
    this.log('window.chatMemory content:', 'debug', window.chatMemory);
    this.log('window.MAX_CONVERSATIONS:', 'debug', window.MAX_CONVERSATIONS);
    
    // 2. Check cookie functions availability
    this.log('Step 2: Checking cookie functions', 'info');
    this.log('window.getCookie function exists:', 'debug', typeof window.getCookie === 'function');
    this.log('window.setCookie function exists:', 'debug', typeof window.setCookie === 'function');
    
    // 3. Check actual cookie storage
    this.log('Step 3: Inspecting cookie storage', 'info');
    const cookieKey = 'n8n-copilot-chat-memory';
    let cookieData = null;
    
    try {
      if (typeof window.getCookie === 'function') {
        cookieData = window.getCookie(cookieKey);
        this.log('Cookie data retrieved:', 'debug', cookieData ? 'DATA_FOUND' : 'NO_DATA');
        this.log('Cookie data length:', 'debug', cookieData?.length || 0);
        
        if (cookieData) {
          try {
            const parsedCookie = JSON.parse(cookieData);
            this.log('Cookie data parsed successfully:', 'debug', Array.isArray(parsedCookie));
            this.log('Cookie data array length:', 'debug', parsedCookie?.length || 0);
            this.log('Cookie data content preview:', 'debug', parsedCookie?.slice(0, 2));
          } catch (parseError) {
            this.log('Cookie data parse error:', 'error', parseError.message);
          }
        }
      } else {
        this.log('getCookie function not available', 'error');
      }
    } catch (cookieError) {
      this.log('Cookie access error:', 'error', cookieError.message);
    }
    
    // 4. Check localStorage fallback
    this.log('Step 4: Checking localStorage fallback', 'info');
    try {
      const localStorageData = localStorage.getItem('n8n-copilot-chat-memory');
      this.log('localStorage data exists:', 'debug', !!localStorageData);
      this.log('localStorage data length:', 'debug', localStorageData?.length || 0);
      
      if (localStorageData) {
        try {
          const parsedLocal = JSON.parse(localStorageData);
          this.log('localStorage data parsed successfully:', 'debug', Array.isArray(parsedLocal));
          this.log('localStorage data array length:', 'debug', parsedLocal?.length || 0);
        } catch (parseError) {
          this.log('localStorage data parse error:', 'error', parseError.message);
        }
      }
    } catch (localStorageError) {
      this.log('localStorage access error:', 'warn', localStorageError.message);
    }
    
    // 5. Test loadChatHistoryUnified function
    this.log('Step 5: Testing loadChatHistoryUnified function', 'info');
    if (typeof window.loadChatHistoryUnified === 'function') {
      try {
        const loadResult = window.loadChatHistoryUnified();
        this.log('loadChatHistoryUnified result:', 'debug', loadResult);
        this.log('chatMemory after load:', 'debug', window.chatMemory?.length || 0);
      } catch (loadError) {
        this.log('loadChatHistoryUnified error:', 'error', loadError.message);
      }
    } else {
      this.log('loadChatHistoryUnified function not available', 'error');
    }
    
    this.debugState.storageOperations.push({
      timestamp: new Date().toISOString(),
      operation: 'loading_debug',
      cookieData: cookieData ? 'FOUND' : 'NOT_FOUND',
      localStorageData: !!localStorage.getItem('n8n-copilot-chat-memory'),
      memoryLength: window.chatMemory?.length || 0
    });
    
    this.log('=== CHAT HISTORY LOADING DEBUG END ===', 'info');
  }

  // Debug chat history UI rendering
  debugChatHistoryRendering() {
    this.log('=== CHAT HISTORY RENDERING DEBUG START ===', 'info');
    
    // 1. Check DOM elements
    this.log('Step 1: Checking DOM elements', 'info');
    const messagesArea = document.getElementById('n8n-builder-messages');
    this.log('Messages area element exists:', 'debug', !!messagesArea);
    this.log('Messages area innerHTML length:', 'debug', messagesArea?.innerHTML?.length || 0);
    this.log('Messages area children count:', 'debug', messagesArea?.children?.length || 0);
    
    if (messagesArea) {
      this.log('Messages area scroll height:', 'debug', messagesArea.scrollHeight);
      this.log('Messages area scroll top:', 'debug', messagesArea.scrollTop);
      this.log('Messages area client height:', 'debug', messagesArea.clientHeight);
      
      // Check each message element
      Array.from(messagesArea.children).forEach((child, index) => {
        this.log(`Message ${index + 1} class:`, 'debug', child.className);
        this.log(`Message ${index + 1} content length:`, 'debug', child.textContent?.length || 0);
      });
    }
    
    // 2. Check restoreChatHistory function
    this.log('Step 2: Testing restoreChatHistory function', 'info');
    if (typeof window.restoreChatHistory === 'function') {
      try {
        // Store current state before restore
        const beforeRestore = {
          memoryLength: window.chatMemory?.length || 0,
          domChildren: messagesArea?.children?.length || 0
        };
        
        this.log('Before restore - Memory length:', 'debug', beforeRestore.memoryLength);
        this.log('Before restore - DOM children:', 'debug', beforeRestore.domChildren);
        
        window.restoreChatHistory();
        
        const afterRestore = {
          memoryLength: window.chatMemory?.length || 0,
          domChildren: messagesArea?.children?.length || 0
        };
        
        this.log('After restore - Memory length:', 'debug', afterRestore.memoryLength);
        this.log('After restore - DOM children:', 'debug', afterRestore.domChildren);
        
        this.debugState.uiOperations.push({
          timestamp: new Date().toISOString(),
          operation: 'restore_chat_history',
          beforeRestore,
          afterRestore
        });
        
      } catch (restoreError) {
        this.log('restoreChatHistory error:', 'error', restoreError.message);
      }
    } else {
      this.log('restoreChatHistory function not available', 'error');
    }
    
    // 3. Test addMessage function
    this.log('Step 3: Testing addMessage function', 'info');
    if (typeof window.addMessage === 'function') {
      const testMessage = `Debug test message - ${Date.now()}`;
      const beforeAdd = {
        memoryLength: window.chatMemory?.length || 0,
        domChildren: messagesArea?.children?.length || 0
      };
      
      try {
        window.addMessage('user', testMessage);
        
        const afterAdd = {
          memoryLength: window.chatMemory?.length || 0,
          domChildren: messagesArea?.children?.length || 0
        };
        
        this.log('addMessage test - Before:', 'debug', beforeAdd);
        this.log('addMessage test - After:', 'debug', afterAdd);
        this.log('addMessage test - Memory increased:', 'debug', afterAdd.memoryLength > beforeAdd.memoryLength);
        this.log('addMessage test - DOM updated:', 'debug', afterAdd.domChildren > beforeAdd.domChildren);
        
        // Check if message was persisted
        setTimeout(() => {
          const cookieData = window.getCookie?.('n8n-copilot-chat-memory');
          const isPersisted = cookieData && cookieData.includes(testMessage);
          this.log('addMessage test - Persisted to cookie:', 'debug', isPersisted);
        }, 100);
        
      } catch (addError) {
        this.log('addMessage test error:', 'error', addError.message);
      }
    } else {
      this.log('addMessage function not available', 'error');
    }
    
    this.log('=== CHAT HISTORY RENDERING DEBUG END ===', 'info');
  }

  // Debug data persistence mechanisms
  debugDataPersistence() {
    this.log('=== DATA PERSISTENCE DEBUG START ===', 'info');
    
    const testData = {
      timestamp: Date.now(),
      testMessage: 'Debug persistence test',
      messages: [
        { role: 'user', content: 'Test user message' },
        { role: 'assistant', content: 'Test assistant message' }
      ]
    };
    
    // 1. Test cookie persistence
    this.log('Step 1: Testing cookie persistence', 'info');
    try {
      if (typeof window.setCookie === 'function' && typeof window.getCookie === 'function') {
        const testKey = 'debug-test-cookie';
        const testValue = JSON.stringify(testData);
        
        // Set cookie
        window.setCookie(testKey, testValue, 1);
        this.log('Cookie set successfully', 'debug');
        
        // Get cookie immediately
        const retrievedValue = window.getCookie(testKey);
        const cookieWorking = retrievedValue === testValue;
        this.log('Cookie retrieval working:', 'debug', cookieWorking);
        
        if (cookieWorking) {
          try {
            const parsedRetrieved = JSON.parse(retrievedValue);
            this.log('Cookie JSON parsing working:', 'debug', parsedRetrieved.timestamp === testData.timestamp);
          } catch (parseError) {
            this.log('Cookie JSON parsing failed:', 'error', parseError.message);
          }
        }
        
        // Clean up test cookie
        window.setCookie(testKey, '', -1);
        
      } else {
        this.log('Cookie functions not available', 'error');
      }
    } catch (cookieTestError) {
      this.log('Cookie persistence test error:', 'error', cookieTestError.message);
    }
    
    // 2. Test localStorage persistence
    this.log('Step 2: Testing localStorage persistence', 'info');
    try {
      const testKey = 'debug-test-localstorage';
      const testValue = JSON.stringify(testData);
      
      localStorage.setItem(testKey, testValue);
      const retrievedValue = localStorage.getItem(testKey);
      const localStorageWorking = retrievedValue === testValue;
      this.log('localStorage working:', 'debug', localStorageWorking);
      
      // Clean up
      localStorage.removeItem(testKey);
      
    } catch (localStorageTestError) {
      this.log('localStorage persistence test error:', 'warn', localStorageTestError.message);
    }
    
    // 3. Test actual chat memory persistence
    this.log('Step 3: Testing chat memory persistence', 'info');
    const originalMemory = window.chatMemory ? [...window.chatMemory] : [];
    const originalLength = originalMemory.length;
    
    try {
      // Add a test message to memory
      if (!window.chatMemory) {
        window.chatMemory = [];
      }
      
      const testChatMessage = {
        role: 'user',
        content: `Debug test - ${Date.now()}`
      };
      
      window.chatMemory.push(testChatMessage);
      
      // Try to persist using setCookie
      if (typeof window.setCookie === 'function') {
        window.setCookie('n8n-copilot-chat-memory', JSON.stringify(window.chatMemory), 7);
        
        // Verify persistence
        setTimeout(() => {
          const persistedData = window.getCookie?.('n8n-copilot-chat-memory');
          if (persistedData) {
            try {
              const parsedPersisted = JSON.parse(persistedData);
              const testMessageFound = parsedPersisted.some(msg => msg.content === testChatMessage.content);
              this.log('Chat memory persistence working:', 'debug', testMessageFound);
              
              this.debugState.storageOperations.push({
                timestamp: new Date().toISOString(),
                operation: 'persistence_test',
                originalLength,
                newLength: parsedPersisted.length,
                testMessagePersisted: testMessageFound
              });
              
            } catch (parseError) {
              this.log('Chat memory persistence parse error:', 'error', parseError.message);
            }
          } else {
            this.log('Chat memory not persisted to cookie', 'error');
          }
        }, 100);
      }
      
      // Restore original memory
      window.chatMemory = originalMemory;
      
    } catch (memoryTestError) {
      this.log('Chat memory persistence test error:', 'error', memoryTestError.message);
      // Restore original memory on error
      window.chatMemory = originalMemory;
    }
    
    this.log('=== DATA PERSISTENCE DEBUG END ===', 'info');
  }

  // Generate comprehensive debug report
  generateDebugReport() {
    this.log('=== GENERATING COMPREHENSIVE DEBUG REPORT ===', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      totalOperations: this.operationCounter,
      
      // Current state snapshot
      currentState: {
        chatMemory: {
          exists: !!window.chatMemory,
          type: typeof window.chatMemory,
          length: window.chatMemory?.length || 0,
          content: window.chatMemory?.slice(0, 3) // First 3 messages for preview
        },
        
        storage: {
          cookieFunctions: {
            getCookie: typeof window.getCookie === 'function',
            setCookie: typeof window.setCookie === 'function'
          },
          cookieData: {
            exists: !!window.getCookie?.('n8n-copilot-chat-memory'),
            length: window.getCookie?.('n8n-copilot-chat-memory')?.length || 0
          },
          localStorage: {
            accessible: this.testLocalStorageAccess(),
            hasData: !!localStorage.getItem?.('n8n-copilot-chat-memory')
          }
        },
        
        ui: {
          messagesArea: {
            exists: !!document.getElementById('n8n-builder-messages'),
            childrenCount: document.getElementById('n8n-builder-messages')?.children?.length || 0
          },
          functions: {
            addMessage: typeof window.addMessage === 'function',
            restoreChatHistory: typeof window.restoreChatHistory === 'function',
            loadChatHistoryUnified: typeof window.loadChatHistoryUnified === 'function'
          }
        }
      },
      
      // Debug state summary
      debugState: this.debugState,
      
      // Issues detected
      issues: this.detectIssues()
    };
    
    this.log('Debug report generated', 'info', report);
    
    // Also log a formatted summary
    this.logFormattedSummary(report);
    
    return report;
  }

  // Test localStorage access
  testLocalStorageAccess() {
    try {
      const testKey = 'debug-access-test';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return retrieved === 'test';
    } catch (error) {
      return false;
    }
  }

  // Detect common issues
  detectIssues() {
    const issues = [];
    
    // Check for missing functions
    if (typeof window.getCookie !== 'function') {
      issues.push({
        type: 'missing_function',
        severity: 'high',
        description: 'getCookie function not available',
        impact: 'Cannot read chat history from cookies'
      });
    }
    
    if (typeof window.setCookie !== 'function') {
      issues.push({
        type: 'missing_function',
        severity: 'high',
        description: 'setCookie function not available',
        impact: 'Cannot persist chat history to cookies'
      });
    }
    
    if (typeof window.addMessage !== 'function') {
      issues.push({
        type: 'missing_function',
        severity: 'high',
        description: 'addMessage function not available',
        impact: 'Cannot add messages to chat'
      });
    }
    
    // Check for data inconsistencies
    const cookieData = window.getCookie?.('n8n-copilot-chat-memory');
    const memoryLength = window.chatMemory?.length || 0;
    
    if (cookieData && memoryLength === 0) {
      issues.push({
        type: 'data_inconsistency',
        severity: 'medium',
        description: 'Cookie has data but memory is empty',
        impact: 'Chat history not loaded into memory'
      });
    }
    
    if (!cookieData && memoryLength > 0) {
      issues.push({
        type: 'data_inconsistency',
        severity: 'medium',
        description: 'Memory has data but cookie is empty',
        impact: 'Chat history not persisted'
      });
    }
    
    // Check DOM state
    const messagesArea = document.getElementById('n8n-builder-messages');
    if (!messagesArea && memoryLength > 0) {
      issues.push({
        type: 'ui_issue',
        severity: 'high',
        description: 'Messages area not found but memory has data',
        impact: 'Chat history cannot be displayed'
      });
    }
    
    return issues;
  }

  // Log formatted summary
  logFormattedSummary(report) {
    console.group(`${this.debugPrefix} SUMMARY REPORT`);
    
    console.log('📊 Session Info:');
    console.log(`   Duration: ${report.sessionDuration}ms`);
    console.log(`   Operations: ${report.totalOperations}`);
    
    console.log('💾 Storage State:');
    console.log(`   Memory Length: ${report.currentState.chatMemory.length}`);
    console.log(`   Cookie Data: ${report.currentState.storage.cookieData.exists ? 'EXISTS' : 'MISSING'}`);
    console.log(`   localStorage: ${report.currentState.storage.localStorage.accessible ? 'ACCESSIBLE' : 'BLOCKED'}`);
    
    console.log('🎨 UI State:');
    console.log(`   Messages Area: ${report.currentState.ui.messagesArea.exists ? 'EXISTS' : 'MISSING'}`);
    console.log(`   DOM Children: ${report.currentState.ui.messagesArea.childrenCount}`);
    
    console.log('⚠️ Issues Detected:');
    if (report.issues.length === 0) {
      console.log('   No issues detected');
    } else {
      report.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
        console.log(`      Impact: ${issue.impact}`);
      });
    }
    
    console.log('📈 Debug Operations:');
    console.log(`   Storage Operations: ${report.debugState.storageOperations.length}`);
    console.log(`   UI Operations: ${report.debugState.uiOperations.length}`);
    console.log(`   Errors: ${report.debugState.errors.length}`);
    console.log(`   Warnings: ${report.debugState.warnings.length}`);
    
    console.groupEnd();
  }

  // Run all debug tests
  runFullDebugSuite() {
    this.log('🚀 Starting full chat history debug suite', 'info');
    
    try {
      this.debugChatHistoryLoading();
      this.debugChatHistoryRendering();
      this.debugDataPersistence();
      
      const report = this.generateDebugReport();
      
      this.log('✅ Full debug suite completed successfully', 'info');
      return report;
      
    } catch (error) {
      this.log('❌ Debug suite failed:', 'error', error.message);
      throw error;
    }
  }
}

// Create global debug instance
window.chatHistoryDebugger = new ChatHistoryDebugger();

// Convenience functions for easy access
window.debugChatHistory = () => window.chatHistoryDebugger.runFullDebugSuite();
window.debugChatHistoryLoading = () => window.chatHistoryDebugger.debugChatHistoryLoading();
window.debugChatHistoryRendering = () => window.chatHistoryDebugger.debugChatHistoryRendering();
window.debugChatHistoryPersistence = () => window.chatHistoryDebugger.debugDataPersistence();
window.getChatHistoryDebugReport = () => window.chatHistoryDebugger.generateDebugReport();

// Auto-run debug on load if in debug mode
if (window.location.search.includes('debug=chat') || window.localStorage?.getItem('n8n-copilot-debug') === 'chat') {
  console.log('🔍 Auto-running chat history debug suite...');
  setTimeout(() => {
    window.debugChatHistory();
  }, 1000);
}

console.log('🔧 Chat History Debugger loaded. Available functions:');
console.log('   - debugChatHistory() - Run full debug suite');
console.log('   - debugChatHistoryLoading() - Debug loading process');
console.log('   - debugChatHistoryRendering() - Debug UI rendering');
console.log('   - debugChatHistoryPersistence() - Debug data persistence');
console.log('   - getChatHistoryDebugReport() - Get current debug report');