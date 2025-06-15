// chatbot/test_enhanced_chat_history.js
// Comprehensive test suite for the enhanced chat history implementation

/**
 * Enhanced Chat History Test Suite
 * 
 * Tests the new architecture including:
 * 1. IndexedDB storage with atomic operations
 * 2. UI diffing algorithm performance
 * 3. Memory management and conversation limits
 * 4. History restoration and conversation management
 * 5. Error handling and fallback mechanisms
 * 6. Integration between all components
 */

class EnhancedChatHistoryTestSuite {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.testCounter = 0;
    
    console.log('🧪 Enhanced Chat History Test Suite initialized');
  }

  // Log test results
  logTest(testName, passed, details = null, error = null) {
    const testResult = {
      id: ++this.testCounter,
      name: testName,
      passed,
      details,
      error: error?.message || null,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime
    };
    
    this.testResults.push(testResult);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const message = `${status} [${this.testCounter}] ${testName}`;
    
    if (passed) {
      console.log(message, details || '');
    } else {
      console.error(message, error || details || '');
    }
    
    return testResult;
  }

  // Test IndexedDB functionality
  async testIndexedDBFunctionality() {
    console.log('\n🗄️ Testing IndexedDB Functionality...');
    
    try {
      // Test 1: IndexedDB availability
      const isAvailable = 'indexedDB' in window;
      this.logTest('IndexedDB availability', isAvailable);
      
      if (!isAvailable) {
        this.logTest('IndexedDB tests skipped', true, 'IndexedDB not supported in this environment');
        return;
      }

      // Test 2: ChatDataManager initialization
      const dataManagerExists = !!window.chatDataManager;
      this.logTest('ChatDataManager exists', dataManagerExists);
      
      if (!dataManagerExists) {
        this.logTest('ChatDataManager tests skipped', false, 'ChatDataManager not initialized');
        return;
      }

      // Test 3: Database initialization
      await window.chatDataManager.initializeDatabase();
      const dbInitialized = window.chatDataManager.dbInitialized;
      this.logTest('Database initialization', dbInitialized);

      // Test 4: Atomic message addition
      const testMessage = {
        role: 'user',
        content: `Test message - ${Date.now()}`
      };
      
      const addResult = await window.chatDataManager.addMessage(testMessage);
      this.logTest('Atomic message addition', !!addResult, addResult);

      // Test 5: Memory statistics
      const stats = window.chatDataManager.getMemoryStats();
      this.logTest('Memory statistics', stats.totalMessages > 0, stats);

      // Test 6: Data persistence
      await window.chatDataManager.persistToStorage();
      this.logTest('Data persistence', true, 'Data persisted successfully');

      // Test 7: Data loading
      const loadedData = await window.chatDataManager.loadFromStorage();
      this.logTest('Data loading', Array.isArray(loadedData), `Loaded ${loadedData.length} messages`);

    } catch (error) {
      this.logTest('IndexedDB functionality', false, null, error);
    }
  }

  // Test UI diffing algorithm
  testUIDiffingAlgorithm() {
    console.log('\n🎨 Testing UI Diffing Algorithm...');
    
    try {
      // Test 1: MessageDiffer availability
      const differExists = !!window.messageDiffer;
      this.logTest('MessageDiffer exists', differExists);
      
      if (!differExists) {
        this.logTest('UI diffing tests skipped', false, 'MessageDiffer not available');
        return;
      }

      // Test 2: Empty diff calculation
      const emptyDiff = window.messageDiffer.calculateDiff([]);
      this.logTest('Empty diff calculation', Array.isArray(emptyDiff), `${emptyDiff.length} operations`);

      // Test 3: Append-only optimization
      const initialMessages = [
        { role: 'user', content: 'Message 1', timestamp: '2023-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Message 2', timestamp: '2023-01-01T00:01:00Z' }
      ];
      
      window.messageDiffer.calculateDiff(initialMessages);
      
      const newMessages = [
        ...initialMessages,
        { role: 'user', content: 'Message 3', timestamp: '2023-01-01T00:02:00Z' }
      ];
      
      const appendDiff = window.messageDiffer.calculateDiff(newMessages);
      const hasAppendOperation = appendDiff.some(op => op.type === 'append');
      this.logTest('Append-only optimization', hasAppendOperation, `${appendDiff.length} operations`);

      // Test 4: Performance test with large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Performance test message ${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      }));
      
      const perfStartTime = performance.now();
      const largeDiff = window.messageDiffer.calculateDiff(largeDataset);
      const perfEndTime = performance.now();
      const perfDuration = perfEndTime - perfStartTime;
      
      this.logTest('Large dataset performance', perfDuration < 100, `${perfDuration.toFixed(2)}ms for ${largeDataset.length} messages`);

      // Test 5: Reset functionality
      window.messageDiffer.reset();
      const resetDiff = window.messageDiffer.calculateDiff(initialMessages);
      const hasFullRender = resetDiff.some(op => op.type === 'full-render');
      this.logTest('Differ reset functionality', hasFullRender, 'Full render after reset');

    } catch (error) {
      this.logTest('UI diffing algorithm', false, null, error);
    }
  }

  // Test conversation history management
  async testConversationHistory() {
    console.log('\n📚 Testing Conversation History Management...');
    
    try {
      if (!window.chatDataManager) {
        this.logTest('History tests skipped', false, 'ChatDataManager not available');
        return;
      }

      // Test 1: Save conversation to history
      const testConversation = [
        { role: 'user', content: 'Test history message 1' },
        { role: 'assistant', content: 'Test history response 1' },
        { role: 'user', content: 'Test history message 2' }
      ];
      
      await window.chatDataManager.loadConversation(testConversation);
      const savedItem = await window.chatDataManager.saveToHistory('Test Conversation');
      this.logTest('Save to history', !!savedItem.id, `Saved with ID: ${savedItem.id}`);

      // Test 2: Get history list
      const historyList = await window.chatDataManager.getHistory();
      this.logTest('Get history list', Array.isArray(historyList), `${historyList.length} items`);

      // Test 3: Load from history
      const loadedItem = await window.chatDataManager.loadFromHistory(savedItem.id);
      this.logTest('Load from history', loadedItem.messages.length === testConversation.length, `Loaded ${loadedItem.messages.length} messages`);

      // Test 4: Delete from history
      await window.chatDataManager.deleteFromHistory(savedItem.id);
      const historyAfterDelete = await window.chatDataManager.getHistory();
      const itemDeleted = !historyAfterDelete.find(item => item.id === savedItem.id);
      this.logTest('Delete from history', itemDeleted, 'Item successfully deleted');

      // Test 5: History pruning (if applicable)
      const currentHistoryCount = historyAfterDelete.length;
      this.logTest('History pruning check', currentHistoryCount <= window.chatDataManager.maxHistoryItems, `${currentHistoryCount} items (max: ${window.chatDataManager.maxHistoryItems})`);

    } catch (error) {
      this.logTest('Conversation history management', false, null, error);
    }
  }

  // Test error handling and fallbacks
  async testErrorHandlingAndFallbacks() {
    console.log('\n🛡️ Testing Error Handling and Fallbacks...');
    
    try {
      // Test 1: Invalid message validation
      try {
        await window.chatDataManager?.addMessage({ invalid: 'message' });
        this.logTest('Invalid message validation', false, 'Should have thrown error');
      } catch (error) {
        this.logTest('Invalid message validation', true, 'Correctly rejected invalid message');
      }

      // Test 2: Cookie fallback availability
      const cookieFunctionsAvailable = typeof window.getCookie === 'function' && typeof window.setCookie === 'function';
      this.logTest('Cookie fallback functions', cookieFunctionsAvailable);

      // Test 3: localStorage fallback
      let localStorageWorking = false;
      try {
        localStorage.setItem('test-fallback', 'test');
        localStorageWorking = localStorage.getItem('test-fallback') === 'test';
        localStorage.removeItem('test-fallback');
      } catch (error) {
        // localStorage not available
      }
      this.logTest('localStorage fallback', localStorageWorking);

      // Test 4: Notification system
      const notificationSystemAvailable = typeof window.showNotification === 'function';
      this.logTest('Notification system', notificationSystemAvailable);

      // Test 5: Graceful degradation
      const hasMultipleFallbacks = cookieFunctionsAvailable || localStorageWorking;
      this.logTest('Graceful degradation', hasMultipleFallbacks, 'Multiple storage fallbacks available');

    } catch (error) {
      this.logTest('Error handling and fallbacks', false, null, error);
    }
  }

  // Test UI integration
  testUIIntegration() {
    console.log('\n🖥️ Testing UI Integration...');
    
    try {
      // Test 1: Required DOM elements
      const messagesArea = document.getElementById('n8n-builder-messages');
      this.logTest('Messages area element', !!messagesArea);

      const historyModal = document.getElementById('n8n-builder-history-modal');
      this.logTest('History modal element', !!historyModal);

      const historyList = document.getElementById('n8n-builder-history-list');
      this.logTest('History list element', !!historyList);

      // Test 2: UI functions availability
      const addMessageExists = typeof window.addMessage === 'function';
      this.logTest('addMessage function', addMessageExists);

      const refreshUIExists = typeof window.refreshChatUI === 'function';
      this.logTest('refreshChatUI function', refreshUIExists);

      // Test 3: Event listeners setup
      const historyButton = document.getElementById('n8n-builder-history');
      const hasHistoryButton = !!historyButton;
      this.logTest('History button element', hasHistoryButton);

      const clearButton = document.getElementById('n8n-builder-clear');
      const hasClearButton = !!clearButton;
      this.logTest('Clear button element', hasClearButton);

      // Test 4: UI rendering functions
      if (messagesArea) {
        const initialChildCount = messagesArea.children.length;
        
        // Test message rendering
        if (typeof window.renderMessages === 'function') {
          const testMessages = [
            { role: 'user', content: 'UI test message', timestamp: new Date().toISOString() }
          ];
          
          const renderResult = window.renderMessages(testMessages);
          this.logTest('Message rendering', renderResult, 'Messages rendered successfully');
        }
      }

    } catch (error) {
      this.logTest('UI integration', false, null, error);
    }
  }

  // Test memory management
  async testMemoryManagement() {
    console.log('\n🧠 Testing Memory Management...');
    
    try {
      if (!window.chatDataManager) {
        this.logTest('Memory management tests skipped', false, 'ChatDataManager not available');
        return;
      }

      // Test 1: Memory limits
      const maxConversations = window.chatDataManager.maxConversations;
      this.logTest('Memory limits configured', maxConversations > 0, `Max conversations: ${maxConversations}`);

      // Test 2: Current memory state
      const initialStats = window.chatDataManager.getMemoryStats();
      this.logTest('Memory statistics available', typeof initialStats === 'object', initialStats);

      // Test 3: Memory cleanup (simulate adding many messages)
      const initialMessageCount = initialStats.totalMessages;
      
      // Add messages up to the limit
      const testMessages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Memory test message ${i}`
      }));

      for (const message of testMessages) {
        await window.chatDataManager.addMessage(message);
      }

      const afterAddStats = window.chatDataManager.getMemoryStats();
      this.logTest('Memory growth tracking', afterAddStats.totalMessages > initialMessageCount, `Added ${afterAddStats.totalMessages - initialMessageCount} messages`);

      // Test 4: Memory capacity check
      const isAtCapacity = afterAddStats.isAtCapacity;
      this.logTest('Memory capacity tracking', typeof isAtCapacity === 'boolean', `At capacity: ${isAtCapacity}`);

      // Test 5: Clear memory
      await window.chatDataManager.clearAllData();
      const afterClearStats = window.chatDataManager.getMemoryStats();
      this.logTest('Memory clearing', afterClearStats.totalMessages === 0, 'Memory successfully cleared');

    } catch (error) {
      this.logTest('Memory management', false, null, error);
    }
  }

  // Test debugging integration
  testDebuggingIntegration() {
    console.log('\n🔍 Testing Debugging Integration...');
    
    try {
      // Test 1: Debug module availability
      const debuggerExists = !!window.chatHistoryDebugger;
      this.logTest('Chat history debugger', debuggerExists);

      // Test 2: Debug functions
      const debugFunctions = [
        'debugChatHistory',
        'debugIndexedDB',
        'debugUIDiffing',
        'debugEnhancedStorage',
        'debugConversationHistory',
        'getChatDebugReport'
      ];

      debugFunctions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        this.logTest(`Debug function: ${funcName}`, exists);
      });

      // Test 3: Debug logging
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('Test debug message', 'info', { test: true });
        this.logTest('Debug logging', true, 'Debug message logged successfully');
      }

    } catch (error) {
      this.logTest('Debugging integration', false, null, error);
    }
  }

  // Generate test report
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${successRate}%`
      },
      results: this.testResults,
      failedTests: this.testResults.filter(test => !test.passed)
    };

    console.log('\n📊 TEST REPORT SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${report.duration}ms`);

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.failedTests.forEach(test => {
        console.log(`   ${test.id}. ${test.name}: ${test.error || test.details || 'Unknown error'}`);
      });
    }

    return report;
  }

  // Run complete test suite
  async runCompleteTestSuite() {
    console.log('🚀 Starting Enhanced Chat History Test Suite...\n');
    
    try {
      await this.testIndexedDBFunctionality();
      this.testUIDiffingAlgorithm();
      await this.testConversationHistory();
      await this.testErrorHandlingAndFallbacks();
      this.testUIIntegration();
      await this.testMemoryManagement();
      this.testDebuggingIntegration();
      
      const report = this.generateTestReport();
      
      console.log('\n✅ Enhanced Chat History Test Suite completed!');
      return report;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.logTest('Test suite execution', false, null, error);
      return this.generateTestReport();
    }
  }
}

// Create global test instance and functions
window.chatHistoryTestSuite = new EnhancedChatHistoryTestSuite();
window.runChatHistoryTests = () => window.chatHistoryTestSuite.runCompleteTestSuite();

// Auto-run tests if in test mode
if (window.location.search.includes('test=chat') || window.localStorage?.getItem('n8n-copilot-test') === 'chat') {
  console.log('🧪 Auto-running chat history test suite...');
  setTimeout(() => {
    window.runChatHistoryTests();
  }, 2000);
}

console.log('🧪 Enhanced Chat History Test Suite loaded. Run tests with: runChatHistoryTests()');