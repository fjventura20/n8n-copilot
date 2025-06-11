// Test for Extension Context Invalidation Fix
// This test simulates the scenario where chrome.runtime.getURL fails

console.log('=== Extension Context Invalidation Fix Test ===');

// Mock chrome runtime to simulate invalidation
const originalChrome = window.chrome;

// Test 1: Simulate extension context invalidation
function testExtensionContextInvalidation() {
  console.log('\n--- Test 1: Extension Context Invalidation ---');
  
  // Remove chrome runtime to simulate invalidation
  delete window.chrome;
  
  try {
    // Try to inject chatbot scripts (this should fail gracefully)
    if (typeof injectChatbotScript === 'function') {
      injectChatbotScript();
      console.log('✅ injectChatbotScript handled invalidation gracefully');
    } else {
      console.log('⚠️ injectChatbotScript function not available');
    }
    
    // Try to get resource URLs (this should return empty object)
    if (typeof getResourceURLs === 'function') {
      const urls = getResourceURLs();
      if (Object.keys(urls).length === 0) {
        console.log('✅ getResourceURLs returned empty object as expected');
      } else {
        console.log('❌ getResourceURLs should return empty object when context invalid');
      }
    } else {
      console.log('⚠️ getResourceURLs function not available');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Test 2: Simulate fetchResource with invalid context
function testFetchResourceInvalidation() {
  console.log('\n--- Test 2: FetchResource Invalidation ---');
  
  if (typeof fetchResource === 'function') {
    fetchResource('chatbot/chatbot.html')
      .then(html => {
        console.log('❌ fetchResource should have failed');
      })
      .catch(error => {
        console.log('✅ fetchResource failed gracefully:', error.message);
      });
  } else {
    console.log('⚠️ fetchResource function not available');
  }
}

// Test 3: Test processChatHtml with null HTML
function testProcessChatHtmlWithNull() {
  console.log('\n--- Test 3: ProcessChatHtml with Null ---');
  
  if (typeof window.processChatHtml === 'function') {
    try {
      window.processChatHtml(null);
      console.log('✅ processChatHtml handled null HTML gracefully');
    } catch (error) {
      console.error('❌ processChatHtml failed with null HTML:', error);
    }
  } else {
    console.log('⚠️ processChatHtml function not available');
  }
}

// Test 4: Restore chrome and test normal operation
function testNormalOperation() {
  console.log('\n--- Test 4: Normal Operation After Restore ---');
  
  // Restore chrome runtime
  window.chrome = originalChrome;
  
  if (typeof isExtensionContextValid === 'function') {
    const isValid = isExtensionContextValid();
    if (isValid) {
      console.log('✅ Extension context validation works correctly');
    } else {
      console.log('❌ Extension context should be valid after restore');
    }
  } else {
    console.log('⚠️ isExtensionContextValid function not available');
  }
}

// Run all tests
function runAllTests() {
  console.log('Starting Extension Context Invalidation Fix Tests...');
  
  testExtensionContextInvalidation();
  testFetchResourceInvalidation();
  testProcessChatHtmlWithNull();
  testNormalOperation();
  
  console.log('\n=== Test Suite Complete ===');
}

// Auto-run tests if this script is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}

// Export for manual testing
window.extensionContextTests = {
  runAllTests,
  testExtensionContextInvalidation,
  testFetchResourceInvalidation,
  testProcessChatHtmlWithNull,
  testNormalOperation
};