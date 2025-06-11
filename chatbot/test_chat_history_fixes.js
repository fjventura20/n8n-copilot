// Test file for chat history storage and display fixes
// Tests the new atomic data manager and separated UI operations

// Mock DOM elements for testing
function createMockDOM() {
  // Create mock messages area
  const messagesArea = document.createElement('div');
  messagesArea.id = 'n8n-builder-messages';
  document.body.appendChild(messagesArea);
  
  return { messagesArea };
}

// Mock cookie functions for testing
function mockCookieFunctions() {
  window.setCookie = function(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    console.log(`Mock setCookie: ${name} = ${value.substring(0, 50)}...`);
  };
  
  window.getCookie = function(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const value = c.substring(nameEQ.length, c.length);
        console.log(`Mock getCookie: ${name} = ${value.substring(0, 50)}...`);
        return value;
      }
    }
    console.log(`Mock getCookie: ${name} = null`);
    return null;
  };
}

// Test suite for chat history fixes
class ChatHistoryFixesTest {
  constructor() {
    this.testResults = [];
    this.setupTestEnvironment();
  }

  setupTestEnvironment() {
    console.log('Setting up test environment...');
    
    // Create mock DOM
    this.mockDOM = createMockDOM();
    
    // Mock cookie functions
    mockCookieFunctions();
    
    // Initialize global variables
    window.chatMemory = [];
    window.MAX_CONVERSATIONS = 5;
    
    console.log('Test environment ready');
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    try {
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ ${testName} - FAILED:`, error.message);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  // Test 1: Data validation functions
  async testDataValidation() {
    if (!window.validateMessage || !window.validateConversation) {
      throw new Error('Validation functions not available');
    }

    // Test valid message
    const validMessage = { role: 'user', content: 'Hello world' };
    window.validateMessage(validMessage);

    // Test invalid message
    try {
      window.validateMessage({ role: 'invalid', content: 'test' });
      throw new Error('Should have thrown validation error');
    } catch (error) {
      if (!error.message.includes('Invalid message role')) {
        throw error;
      }
    }

    // Test valid conversation
    const validConversation = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    window.validateConversation(validConversation);

    console.log('Data validation tests passed');
  }

  // Test 2: Atomic data manager operations
  async testAtomicDataManager() {
    if (!window.chatDataManager) {
      throw new Error('chatDataManager not available');
    }

    // Test adding a message
    const message = { role: 'user', content: 'Test message' };
    await window.chatDataManager.addMessage(message);

    const memory = window.chatDataManager.getCurrentMemory();
    if (memory.length !== 1) {
      throw new Error(`Expected 1 message, got ${memory.length}`);
    }

    if (memory[0].content !== 'Test message') {
      throw new Error(`Message content mismatch: ${memory[0].content}`);
    }

    console.log('Atomic data manager tests passed');
  }

  // Test 3: UI separation - addMessageToUI function
  async testUISeparation() {
    if (!window.addMessageToUI) {
      throw new Error('addMessageToUI function not available');
    }

    // Clear messages area
    this.mockDOM.messagesArea.innerHTML = '';

    // Add message to UI only
    const success = window.addMessageToUI('user', 'UI test message');
    if (!success) {
      throw new Error('addMessageToUI returned false');
    }

    // Check DOM was updated
    const messages = this.mockDOM.messagesArea.children;
    if (messages.length !== 1) {
      throw new Error(`Expected 1 DOM message, got ${messages.length}`);
    }

    // Check message content
    const messageContent = messages[0].querySelector('.message-content');
    if (!messageContent || !messageContent.textContent.includes('UI test message')) {
      throw new Error('Message content not found in DOM');
    }

    console.log('UI separation tests passed');
  }

  // Test 4: LoadConversation with different modes
  async testLoadConversationModes() {
    if (!window.loadConversation) {
      throw new Error('loadConversation function not available');
    }

    // Setup initial conversation
    const initialConversation = [
      { role: 'user', content: 'Initial message 1' },
      { role: 'assistant', content: 'Initial response 1' }
    ];

    // Test replace mode
    await window.loadConversation(initialConversation, { mode: 'replace' });
    let memory = window.chatDataManager.getCurrentMemory();
    if (memory.length !== 2) {
      throw new Error(`Replace mode: Expected 2 messages, got ${memory.length}`);
    }

    // Test append mode
    const additionalConversation = [
      { role: 'user', content: 'Additional message' },
      { role: 'assistant', content: 'Additional response' }
    ];

    await window.loadConversation(additionalConversation, { mode: 'append' });
    memory = window.chatDataManager.getCurrentMemory();
    if (memory.length !== 4) {
      throw new Error(`Append mode: Expected 4 messages, got ${memory.length}`);
    }

    console.log('LoadConversation modes tests passed');
  }

  // Test 5: Race condition prevention
  async testRaceConditionPrevention() {
    if (!window.chatDataManager) {
      throw new Error('chatDataManager not available');
    }

    // Clear memory
    await window.chatDataManager.clearAllData();

    // Simulate concurrent operations
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        window.chatDataManager.addMessage({
          role: 'user',
          content: `Concurrent message ${i}`
        })
      );
    }

    // Wait for all operations to complete
    await Promise.all(promises);

    const memory = window.chatDataManager.getCurrentMemory();
    if (memory.length !== 5) {
      throw new Error(`Race condition test: Expected 5 messages, got ${memory.length}`);
    }

    // Check all messages are present and in order
    for (let i = 0; i < 5; i++) {
      const found = memory.some(msg => msg.content === `Concurrent message ${i}`);
      if (!found) {
        throw new Error(`Missing concurrent message ${i}`);
      }
    }

    console.log('Race condition prevention tests passed');
  }

  // Test 6: Storage persistence and loading
  async testStoragePersistence() {
    if (!window.chatDataManager) {
      throw new Error('chatDataManager not available');
    }

    // Clear and add test data
    await window.chatDataManager.clearAllData();
    
    const testMessages = [
      { role: 'user', content: 'Persistence test 1' },
      { role: 'assistant', content: 'Persistence response 1' },
      { role: 'user', content: 'Persistence test 2' }
    ];

    for (const message of testMessages) {
      await window.chatDataManager.addMessage(message);
    }

    // Simulate reload by creating new data manager instance
    const newDataManager = new window.chatDataManager.constructor();
    window.chatDataManager = newDataManager;

    // Load from storage
    const loadedMemory = await window.chatDataManager.loadFromStorage();
    
    if (loadedMemory.length !== 3) {
      throw new Error(`Persistence test: Expected 3 messages, got ${loadedMemory.length}`);
    }

    // Verify content
    if (!loadedMemory.some(msg => msg.content === 'Persistence test 1')) {
      throw new Error('Persistence test: Message 1 not found after reload');
    }

    console.log('Storage persistence tests passed');
  }

  // Test 7: Memory statistics
  async testMemoryStatistics() {
    if (!window.chatDataManager) {
      throw new Error('chatDataManager not available');
    }

    // Clear and add test data
    await window.chatDataManager.clearAllData();
    
    await window.chatDataManager.addMessage({ role: 'user', content: 'User message 1' });
    await window.chatDataManager.addMessage({ role: 'assistant', content: 'Assistant message 1' });
    await window.chatDataManager.addMessage({ role: 'user', content: 'User message 2' });

    const stats = window.chatDataManager.getMemoryStats();
    
    if (stats.totalMessages !== 3) {
      throw new Error(`Stats: Expected 3 total messages, got ${stats.totalMessages}`);
    }
    
    if (stats.userMessages !== 2) {
      throw new Error(`Stats: Expected 2 user messages, got ${stats.userMessages}`);
    }
    
    if (stats.assistantMessages !== 1) {
      throw new Error(`Stats: Expected 1 assistant message, got ${stats.assistantMessages}`);
    }

    console.log('Memory statistics tests passed');
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Chat History Fixes Test Suite\n');

    await this.runTest('Data Validation', () => this.testDataValidation());
    await this.runTest('Atomic Data Manager', () => this.testAtomicDataManager());
    await this.runTest('UI Separation', () => this.testUISeparation());
    await this.runTest('LoadConversation Modes', () => this.testLoadConversationModes());
    await this.runTest('Race Condition Prevention', () => this.testRaceConditionPrevention());
    await this.runTest('Storage Persistence', () => this.testStoragePersistence());
    await this.runTest('Memory Statistics', () => this.testMemoryStatistics());

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\nTotal: ${this.testResults.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Chat history fixes are working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
  }
}

// Auto-run tests when this file is loaded
if (typeof window !== 'undefined') {
  // Wait for DOM and other modules to load
  setTimeout(async () => {
    try {
      const testSuite = new ChatHistoryFixesTest();
      await testSuite.runAllTests();
    } catch (error) {
      console.error('Failed to run test suite:', error);
    }
  }, 1000);
}

// Export for manual testing
window.ChatHistoryFixesTest = ChatHistoryFixesTest;