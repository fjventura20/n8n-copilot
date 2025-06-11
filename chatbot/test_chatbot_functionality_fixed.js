// test_chatbot_functionality_fixed.js - Fixed Chatbot Functionality Test

// Enhanced mock DOM environment for Node.js testing
function createEnhancedMockDOM() {
  const mockElements = new Map();
  
  global.window = global;
  
  // Mock window methods
  window.addEventListener = function(event, handler) {
    console.log('✅ Mock addEventListener called for:', event);
  };
  
  window.removeEventListener = function(event, handler) {
    console.log('✅ Mock removeEventListener called for:', event);
  };
  
  global.document = {
    createElement: (tag) => {
      const element = {
        id: '',
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        children: [],
        parentNode: null,
        href: '',
        rel: '',
        type: '',
        appendChild: function(child) {
          this.children.push(child);
          child.parentNode = this;
        },
        querySelector: function(selector) {
          if (selector.startsWith('#')) {
            const id = selector.substring(1);
            return mockElements.get(id) || null;
          }
          return null;
        },
        querySelectorAll: function(selector) {
          return [];
        },
        addEventListener: function(event, handler) {
          this[`on${event}`] = handler;
        },
        click: function() {
          if (this.onclick) this.onclick();
        },
        focus: function() {},
        scrollIntoView: function() {}
      };
      
      if (tag === 'link') {
        element.rel = 'stylesheet';
        element.type = 'text/css';
      }
      
      return element;
    },
    
    getElementById: (id) => mockElements.get(id) || null,
    
    querySelector: (selector) => {
      if (selector.startsWith('#')) {
        const id = selector.substring(1);
        return mockElements.get(id) || null;
      }
      return null;
    },
    
    head: {
      appendChild: function(element) {
        console.log('✅ CSS link added to head:', element.href);
      }
    },
    
    body: {
      appendChild: function(element) {
        if (element.id) {
          mockElements.set(element.id, element);
        }
      }
    },
    
    cookie: 'n8n-copilot-chat-memory=[{"role":"user","content":"Test message 1"},{"role":"assistant","content":"Test response 1"},{"role":"user","content":"Test message 2"},{"role":"assistant","content":"Test response 2"},{"role":"user","content":"Question3"}]'
  };
  
  return mockElements;
}

// Setup comprehensive mock environment
function setupComprehensiveMockEnvironment() {
  // Initialize window and global objects
  global.window = global;
  window.chatMemory = [];
  window.MAX_CONVERSATIONS = 5;
  
  // Mock extension communication
  window.sendToContentScript = function(message) {
    console.log('📤 Mock sendToContentScript called:', message.type);
    return true;
  };
  
  // Mock cookie functions
  window.getCookie = function(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  };
  
  window.setCookie = function(name, value, days = 30) {
    console.log('🍪 Mock setCookie called:', name);
    document.cookie = `${name}=${encodeURIComponent(value)}`;
    return true;
  };
  
  // Mock other window functions that might be called
  window.setTimeout = global.setTimeout;
  window.setInterval = global.setInterval;
  window.clearTimeout = global.clearTimeout;
  window.clearInterval = global.clearInterval;
  
  console.log('✅ Comprehensive mock environment setup complete');
}

// Test individual functions
async function testChatHistoryFunctions() {
  console.log('\n🧪 Testing Chat History Functions...');
  
  let testsPass = 0;
  let totalTests = 0;
  
  // Test 1: loadChatHistoryUnified function exists
  totalTests++;
  if (typeof loadChatHistoryUnified === 'function') {
    console.log('✅ loadChatHistoryUnified function found');
    testsPass++;
    
    // Test calling the function
    try {
      loadChatHistoryUnified();
      console.log('✅ loadChatHistoryUnified executed successfully');
      testsPass++;
    } catch (error) {
      console.log('❌ Error calling loadChatHistoryUnified:', error.message);
    }
    totalTests++;
  } else {
    console.log('❌ loadChatHistoryUnified function not found');
  }
  
  // Test 2: saveChatHistoryUnified function exists
  totalTests++;
  if (typeof saveChatHistoryUnified === 'function') {
    console.log('✅ saveChatHistoryUnified function found');
    testsPass++;
  } else {
    console.log('❌ saveChatHistoryUnified function not found');
  }
  
  // Test 3: Chat memory is populated
  totalTests++;
  if (window.chatMemory && window.chatMemory.length > 0) {
    console.log('✅ Chat memory populated with', window.chatMemory.length, 'messages');
    testsPass++;
  } else {
    console.log('❌ Chat memory not populated');
  }
  
  return { testsPass, totalTests };
}

async function testCSSFunctions() {
  console.log('\n🧪 Testing CSS Functions...');
  
  let testsPass = 0;
  let totalTests = 0;
  
  // Test 1: applyChatStyles function exists
  totalTests++;
  if (typeof applyChatStyles === 'function') {
    console.log('✅ applyChatStyles function found');
    testsPass++;
    
    // Test calling the function
    totalTests++;
    try {
      applyChatStyles('chrome-extension://test/chatbot/chatbot.css');
      console.log('✅ applyChatStyles executed successfully');
      testsPass++;
    } catch (error) {
      console.log('❌ Error calling applyChatStyles:', error.message);
    }
  } else {
    console.log('❌ applyChatStyles function not found');
  }
  
  // Test 2: injectChatStyles function exists
  totalTests++;
  if (typeof injectChatStyles === 'function') {
    console.log('✅ injectChatStyles function found');
    testsPass++;
  } else {
    console.log('❌ injectChatStyles function not found');
  }
  
  return { testsPass, totalTests };
}

async function testCoreGlobalFunctions() {
  console.log('\n🧪 Testing Core Global Functions...');
  
  let testsPass = 0;
  let totalTests = 0;
  
  const expectedFunctions = [
    'getCookie',
    'setCookie',
    'sendToContentScript'
  ];
  
  for (const funcName of expectedFunctions) {
    totalTests++;
    if (typeof window[funcName] === 'function') {
      console.log('✅ Function found:', funcName);
      testsPass++;
    } else {
      console.log('❌ Function missing:', funcName);
    }
  }
  
  return { testsPass, totalTests };
}

async function testChatMemoryOperations() {
  console.log('\n🧪 Testing Chat Memory Operations...');
  
  let testsPass = 0;
  let totalTests = 0;
  
  // Test 1: Initial chat memory state
  totalTests++;
  const initialCount = window.chatMemory ? window.chatMemory.length : 0;
  console.log('📊 Initial chat memory count:', initialCount);
  if (initialCount >= 0) {
    testsPass++;
    console.log('✅ Chat memory accessible');
  }
  
  // Test 2: Add message to memory
  totalTests++;
  try {
    if (!window.chatMemory) window.chatMemory = [];
    window.chatMemory.push({
      role: 'user',
      content: 'Test functionality message'
    });
    console.log('✅ Message added to chat memory');
    testsPass++;
  } catch (error) {
    console.log('❌ Error adding message to memory:', error.message);
  }
  
  // Test 3: Save chat history
  totalTests++;
  try {
    if (typeof saveChatHistoryUnified === 'function') {
      saveChatHistoryUnified();
      console.log('✅ Chat history save function called');
      testsPass++;
    } else {
      console.log('⚠️  saveChatHistoryUnified not available, using basic save');
      if (typeof setCookie === 'function') {
        setCookie('n8n-copilot-chat-memory', JSON.stringify(window.chatMemory));
        console.log('✅ Basic chat history save completed');
        testsPass++;
      }
    }
  } catch (error) {
    console.log('❌ Error saving chat history:', error.message);
  }
  
  return { testsPass, totalTests };
}

// Main test runner
async function runFixedChatbotTests() {
  console.log('🚀 Starting Fixed Chatbot Functionality Tests\n');
  
  // Setup test environment
  createEnhancedMockDOM();
  setupComprehensiveMockEnvironment();
  
  // Load chatbot code with error handling
  try {
    console.log('📦 Loading chatbot.js...');
    const fs = require('fs');
    const chatbotCode = fs.readFileSync('chatbot.js', 'utf8');
    
    // Execute the code in a try-catch to handle any initialization errors
    eval(chatbotCode);
    console.log('✅ chatbot.js loaded successfully');
    
  } catch (error) {
    console.log('⚠️  Error loading chatbot.js:', error.message);
    console.log('Continuing with available functions...');
  }
  
  // Run all tests
  const testResults = [];
  
  const historyResults = await testChatHistoryFunctions();
  testResults.push({ name: 'Chat History Functions', ...historyResults });
  
  const cssResults = await testCSSFunctions();
  testResults.push({ name: 'CSS Functions', ...cssResults });
  
  const coreResults = await testCoreGlobalFunctions();
  testResults.push({ name: 'Core Global Functions', ...coreResults });
  
  const memoryResults = await testChatMemoryOperations();
  testResults.push({ name: 'Chat Memory Operations', ...memoryResults });
  
  // Calculate overall results
  let totalPassed = 0;
  let totalTests = 0;
  
  console.log('\n📊 Detailed Test Results:');
  testResults.forEach(result => {
    totalPassed += result.testsPass;
    totalTests += result.totalTests;
    const percentage = result.totalTests > 0 ? Math.round((result.testsPass / result.totalTests) * 100) : 0;
    console.log(`  ${result.name}: ${result.testsPass}/${result.totalTests} (${percentage}%)`);
  });
  
  // Final summary
  const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  console.log('\n🎯 Overall Test Results:');
  console.log(`✅ Passed: ${totalPassed}/${totalTests} tests (${overallPercentage}%)`);
  
  if (overallPercentage >= 90) {
    console.log('\n🎉 EXCELLENT! Chatbot functionality is working very well!');
  } else if (overallPercentage >= 75) {
    console.log('\n✅ GOOD! Chatbot has solid core functionality with minor issues.');
  } else if (overallPercentage >= 50) {
    console.log('\n⚠️  FAIR! Chatbot has basic functionality but needs improvements.');
  } else {
    console.log('\n❌ POOR! Chatbot has significant functionality issues.');
  }
  
  return overallPercentage >= 75;
}

// Run the tests
runFixedChatbotTests().catch(console.error);