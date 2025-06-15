// chatbot/modules/chatbot-debug.js
// Decoupled debugging module for chat history functionality

/**
 * Enhanced Chat History Debugger - Decoupled from core chat logic
 * 
 * This module provides comprehensive debugging for:
 * 1. IndexedDB storage operations and fallback mechanisms
 * 2. UI rendering with diffing algorithm performance
 * 3. Data persistence across multiple storage layers
 * 4. Memory management and conversation limits
 * 5. Error handling and user notifications
 */

class EnhancedChatHistoryDebugger {
  constructor() {
    this.debugPrefix = '[CHAT_DEBUG]';
    this.logLevel = 'verbose'; // 'minimal', 'standard', 'verbose'
    this.startTime = Date.now();
    this.operationCounter = 0;
    
    // Enhanced debug state tracking
    this.debugState = {
      storageOperations: [],
      uiOperations: [],
      memoryOperations: [],
      indexedDBOperations: [],
      diffingOperations: [],
      errors: [],
      warnings: [],
      performance: []
    };
    
    this.log('Enhanced Chat History Debugger initialized', 'info');
  }

  // Core logging method with enhanced metadata
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
      data,
      stack: level === 'error' ? new Error().stack : null
    };

    // Store in appropriate debug state category
    switch (level) {
      case 'error':
        this.debugState.errors.push(logEntry);
        break;
      case 'warn':
        this.debugState.warnings.push(logEntry);
        break;
      case 'performance':
        this.debugState.performance.push(logEntry);
        break;
    }

    // Console output with enhanced formatting
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
      case 'performance':
        console.log(`🚀 ${fullMessage}`, data || '');
        break;
      default:
        console.log(fullMessage, data || '');
    }
  }

  // Debug IndexedDB operations
  async debugIndexedDBOperations() {
    this.log('=== INDEXEDDB OPERATIONS DEBUG START ===', 'info');
    
    const startTime = performance.now();
    
    try {
      // Test IndexedDB availability
      this.log('Step 1: Testing IndexedDB availability', 'info');
      const isAvailable = 'indexedDB' in window;
      this.log('IndexedDB available:', 'debug', isAvailable);
      
      if (!isAvailable) {
        this.log('IndexedDB not supported', 'error');
        return;
      }

      // Test database connection
      this.log('Step 2: Testing database connection', 'info');
      const dbTest = await this.testDatabaseConnection();
      this.log('Database connection test:', 'debug', dbTest);

      // Test data manager integration
      this.log('Step 3: Testing ChatDataManager integration', 'info');
      if (window.chatDataManager) {
        const stats = window.chatDataManager.getMemoryStats();
        this.log('Data manager stats:', 'debug', stats);
        
        // Test atomic operations
        const testMessage = {
          role: 'user',
          content: `Debug test - ${Date.now()}`
        };
        
        try {
          await window.chatDataManager.addMessage(testMessage);
          this.log('Atomic message addition test: SUCCESS', 'debug');
        } catch (error) {
          this.log('Atomic message addition test: FAILED', 'error', error.message);
        }
      } else {
        this.log('ChatDataManager not available', 'error');
      }

      const endTime = performance.now();
      this.log('IndexedDB operations debug completed', 'performance', {
        duration: endTime - startTime,
        operations: 'indexedDB_test'
      });

    } catch (error) {
      this.log('IndexedDB debug error:', 'error', error.message);
    }
    
    this.log('=== INDEXEDDB OPERATIONS DEBUG END ===', 'info');
  }

  // Test database connection
  async testDatabaseConnection() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('debug-test-db', 1);
      
      request.onerror = () => {
        resolve({ success: false, error: request.error });
      };
      
      request.onsuccess = () => {
        const db = request.result;
        db.close();
        // Clean up test database
        indexedDB.deleteDatabase('debug-test-db');
        resolve({ success: true });
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('test', { keyPath: 'id' });
      };
    });
  }

  // Debug UI diffing performance
  debugUIDiffingPerformance() {
    this.log('=== UI DIFFING PERFORMANCE DEBUG START ===', 'info');
    
    const startTime = performance.now();
    
    try {
      // Test message differ
      if (window.messageDiffer) {
        this.log('Step 1: Testing MessageDiffer', 'info');
        
        // Create test messages
        const testMessages = Array.from({ length: 100 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${i}`,
          timestamp: new Date(Date.now() + i * 1000).toISOString()
        }));

        // Test diff calculation performance
        const diffStartTime = performance.now();
        const operations = window.messageDiffer.calculateDiff(testMessages);
        const diffEndTime = performance.now();
        
        this.log('Diff calculation performance:', 'performance', {
          messagesCount: testMessages.length,
          operationsCount: operations.length,
          duration: diffEndTime - diffStartTime
        });

        this.debugState.diffingOperations.push({
          timestamp: new Date().toISOString(),
          messagesCount: testMessages.length,
          operationsCount: operations.length,
          duration: diffEndTime - diffStartTime
        });

      } else {
        this.log('MessageDiffer not available', 'error');
      }

      // Test UI rendering performance
      this.log('Step 2: Testing UI rendering performance', 'info');
      const messagesArea = document.getElementById('n8n-builder-messages');
      
      if (messagesArea) {
        const renderStartTime = performance.now();
        const childrenBefore = messagesArea.children.length;
        
        // Simulate message rendering
        const testDiv = document.createElement('div');
        testDiv.className = 'test-message';
        testDiv.textContent = 'Performance test message';
        messagesArea.appendChild(testDiv);
        
        const renderEndTime = performance.now();
        
        // Clean up
        testDiv.remove();
        
        this.log('UI rendering performance:', 'performance', {
          childrenBefore,
          renderDuration: renderEndTime - renderStartTime
        });
      }

      const endTime = performance.now();
      this.log('UI diffing performance debug completed', 'performance', {
        totalDuration: endTime - startTime
      });

    } catch (error) {
      this.log('UI diffing debug error:', 'error', error.message);
    }
    
    this.log('=== UI DIFFING PERFORMANCE DEBUG END ===', 'info');
  }

  // Debug enhanced storage mechanisms
  async debugEnhancedStorage() {
    this.log('=== ENHANCED STORAGE DEBUG START ===', 'info');
    
    try {
      // Test storage hierarchy: IndexedDB -> Cookie -> localStorage
      this.log('Step 1: Testing storage hierarchy', 'info');
      
      const testData = {
        timestamp: Date.now(),
        messages: [
          { role: 'user', content: 'Test storage message' }
        ]
      };

      // Test IndexedDB primary storage
      if (window.chatDataManager) {
        try {
          await window.chatDataManager.persistToStorage();
          this.log('IndexedDB primary storage: SUCCESS', 'debug');
        } catch (error) {
          this.log('IndexedDB primary storage: FAILED', 'error', error.message);
        }
      }

      // Test cookie fallback
      if (typeof window.setCookie === 'function') {
        try {
          window.setCookie('debug-test-cookie', JSON.stringify(testData), 1);
          const retrieved = window.getCookie('debug-test-cookie');
          const success = retrieved && JSON.parse(retrieved).timestamp === testData.timestamp;
          this.log('Cookie fallback storage:', 'debug', success ? 'SUCCESS' : 'FAILED');
          
          // Clean up
          window.setCookie('debug-test-cookie', '', -1);
        } catch (error) {
          this.log('Cookie fallback storage: ERROR', 'error', error.message);
        }
      }

      // Test localStorage migration
      try {
        localStorage.setItem('debug-test-local', JSON.stringify(testData));
        const retrieved = localStorage.getItem('debug-test-local');
        const success = retrieved && JSON.parse(retrieved).timestamp === testData.timestamp;
        this.log('localStorage migration:', 'debug', success ? 'SUCCESS' : 'FAILED');
        
        // Clean up
        localStorage.removeItem('debug-test-local');
      } catch (error) {
        this.log('localStorage migration: ERROR', 'error', error.message);
      }

    } catch (error) {
      this.log('Enhanced storage debug error:', 'error', error.message);
    }
    
    this.log('=== ENHANCED STORAGE DEBUG END ===', 'info');
  }

  // Debug conversation history functionality
  async debugConversationHistory() {
    this.log('=== CONVERSATION HISTORY DEBUG START ===', 'info');
    
    try {
      if (!window.chatDataManager) {
        this.log('ChatDataManager not available', 'error');
        return;
      }

      // Test history operations
      this.log('Step 1: Testing history operations', 'info');
      
      // Get current history
      const historyItems = await window.chatDataManager.getHistory();
      this.log('Current history items:', 'debug', historyItems.length);

      // Test save to history
      const currentMemory = window.chatDataManager.getCurrentMemory();
      if (currentMemory.length > 0) {
        try {
          const savedItem = await window.chatDataManager.saveToHistory('Debug Test Conversation');
          this.log('Save to history: SUCCESS', 'debug', savedItem.id);
          
          // Test load from history
          const loadedItem = await window.chatDataManager.loadFromHistory(savedItem.id);
          this.log('Load from history: SUCCESS', 'debug', loadedItem.messages.length);
          
          // Clean up test history item
          await window.chatDataManager.deleteFromHistory(savedItem.id);
          this.log('History cleanup: SUCCESS', 'debug');
          
        } catch (error) {
          this.log('History operations: FAILED', 'error', error.message);
        }
      }

    } catch (error) {
      this.log('Conversation history debug error:', 'error', error.message);
    }
    
    this.log('=== CONVERSATION HISTORY DEBUG END ===', 'info');
  }

  // Generate comprehensive debug report
  generateEnhancedDebugReport() {
    this.log('=== GENERATING ENHANCED DEBUG REPORT ===', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      totalOperations: this.operationCounter,
      
      // Enhanced current state
      currentState: {
        dataManager: {
          available: !!window.chatDataManager,
          memoryStats: window.chatDataManager?.getMemoryStats() || null
        },
        
        storage: {
          indexedDB: {
            supported: 'indexedDB' in window,
            initialized: window.chatDataManager?.dbInitialized || false
          },
          fallbacks: {
            cookies: typeof window.getCookie === 'function',
            localStorage: this.testLocalStorageAccess()
          }
        },
        
        ui: {
          messageDiffer: !!window.messageDiffer,
          messagesArea: !!document.getElementById('n8n-builder-messages'),
          historyModal: !!document.getElementById('n8n-builder-history-modal')
        },
        
        performance: {
          diffingOperations: this.debugState.diffingOperations.length,
          averageDiffTime: this.calculateAverageDiffTime(),
          storageOperations: this.debugState.storageOperations.length
        }
      },
      
      // Enhanced debug state
      debugState: this.debugState,
      
      // Issues and recommendations
      issues: this.detectEnhancedIssues(),
      recommendations: this.generateRecommendations()
    };
    
    this.log('Enhanced debug report generated', 'info');
    this.logEnhancedSummary(report);
    
    return report;
  }

  // Calculate average diff time
  calculateAverageDiffTime() {
    const diffOps = this.debugState.diffingOperations;
    if (diffOps.length === 0) return 0;
    
    const totalTime = diffOps.reduce((sum, op) => sum + op.duration, 0);
    return totalTime / diffOps.length;
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

  // Detect enhanced issues
  detectEnhancedIssues() {
    const issues = [];
    
    // Check for missing components
    if (!window.chatDataManager) {
      issues.push({
        type: 'missing_component',
        severity: 'critical',
        description: 'ChatDataManager not available',
        impact: 'Core chat functionality will not work'
      });
    }

    if (!window.messageDiffer) {
      issues.push({
        type: 'missing_component',
        severity: 'high',
        description: 'MessageDiffer not available',
        impact: 'UI rendering will be inefficient'
      });
    }

    // Check storage issues
    if (!('indexedDB' in window)) {
      issues.push({
        type: 'storage_limitation',
        severity: 'medium',
        description: 'IndexedDB not supported',
        impact: 'Will fallback to less reliable storage'
      });
    }

    // Check performance issues
    const avgDiffTime = this.calculateAverageDiffTime();
    if (avgDiffTime > 10) { // More than 10ms average
      issues.push({
        type: 'performance_issue',
        severity: 'medium',
        description: `Slow diffing performance: ${avgDiffTime.toFixed(2)}ms average`,
        impact: 'UI updates may feel sluggish'
      });
    }

    return issues;
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    const issues = this.detectEnhancedIssues();
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_component':
          recommendations.push(`Initialize ${issue.description.split(' ')[0]} component`);
          break;
        case 'storage_limitation':
          recommendations.push('Ensure cookie and localStorage fallbacks are working');
          break;
        case 'performance_issue':
          recommendations.push('Consider optimizing message diffing algorithm');
          break;
      }
    });

    return recommendations;
  }

  // Log enhanced summary
  logEnhancedSummary(report) {
    console.group(`${this.debugPrefix} ENHANCED SUMMARY REPORT`);
    
    console.log('🚀 Performance Metrics:');
    console.log(`   Session Duration: ${report.sessionDuration}ms`);
    console.log(`   Total Operations: ${report.totalOperations}`);
    console.log(`   Average Diff Time: ${report.currentState.performance.averageDiffTime.toFixed(2)}ms`);
    
    console.log('💾 Storage Status:');
    console.log(`   IndexedDB: ${report.currentState.storage.indexedDB.supported ? 'SUPPORTED' : 'NOT_SUPPORTED'}`);
    console.log(`   Data Manager: ${report.currentState.dataManager.available ? 'AVAILABLE' : 'MISSING'}`);
    console.log(`   Fallbacks: ${Object.values(report.currentState.storage.fallbacks).filter(Boolean).length}/2`);
    
    console.log('🎨 UI Components:');
    console.log(`   Message Differ: ${report.currentState.ui.messageDiffer ? 'AVAILABLE' : 'MISSING'}`);
    console.log(`   Messages Area: ${report.currentState.ui.messagesArea ? 'FOUND' : 'NOT_FOUND'}`);
    
    console.log('⚠️ Issues & Recommendations:');
    if (report.issues.length === 0) {
      console.log('   ✅ No critical issues detected');
    } else {
      report.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.groupEnd();
  }

  // Run comprehensive debug suite
  async runEnhancedDebugSuite() {
    this.log('🚀 Starting enhanced chat history debug suite', 'info');
    
    try {
      await this.debugIndexedDBOperations();
      this.debugUIDiffingPerformance();
      await this.debugEnhancedStorage();
      await this.debugConversationHistory();
      
      const report = this.generateEnhancedDebugReport();
      
      this.log('✅ Enhanced debug suite completed successfully', 'info');
      return report;
      
    } catch (error) {
      this.log('❌ Enhanced debug suite failed:', 'error', error.message);
      throw error;
    }
  }
}

// Create global enhanced debug instance
window.chatHistoryDebugger = new EnhancedChatHistoryDebugger();

// Enhanced convenience functions
window.debugChatHistory = () => window.chatHistoryDebugger.runEnhancedDebugSuite();
window.debugIndexedDB = () => window.chatHistoryDebugger.debugIndexedDBOperations();
window.debugUIDiffing = () => window.chatHistoryDebugger.debugUIDiffingPerformance();
window.debugEnhancedStorage = () => window.chatHistoryDebugger.debugEnhancedStorage();
window.debugConversationHistory = () => window.chatHistoryDebugger.debugConversationHistory();
window.getChatDebugReport = () => window.chatHistoryDebugger.generateEnhancedDebugReport();

// Auto-run enhanced debug on load if in debug mode
if (window.location.search.includes('debug=chat') || window.localStorage?.getItem('n8n-copilot-debug') === 'chat') {
  console.log('🔍 Auto-running enhanced chat history debug suite...');
  setTimeout(() => {
    window.debugChatHistory();
  }, 1000);
}

console.log('🔧 Enhanced Chat History Debugger loaded. Available functions:');
console.log('   - debugChatHistory() - Run comprehensive debug suite');
console.log('   - debugIndexedDB() - Debug IndexedDB operations');
console.log('   - debugUIDiffing() - Debug UI diffing performance');
console.log('   - debugEnhancedStorage() - Debug storage mechanisms');
console.log('   - debugConversationHistory() - Debug history functionality');
console.log('   - getChatDebugReport() - Get enhanced debug report');