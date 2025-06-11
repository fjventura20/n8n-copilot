// Test JSON extraction from AI responses
// This tests the specific issue where "Apply to Canvas" button doesn't appear

// Mock window object for Node.js environment
global.window = {
  workflowCreationDebugger: {
    log: (message, level, data) => {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
  }
};

// Mock DOM environment
global.document = {
  getElementById: (id) => {
    if (id === 'n8n-builder-messages') {
      return {
        appendChild: (element) => {
          console.log('✅ Action buttons added to messages area');
          console.log('Button HTML:', element.innerHTML);
        },
        scrollTop: 0,
        scrollHeight: 100,
        children: { length: 0 }
      };
    }
    if (id === 'apply-workflow-btn') {
      return {
        addEventListener: (event, callback) => {
          console.log('✅ Apply to Canvas button event listener added');
          // Simulate button click for testing
          setTimeout(() => {
            console.log('🖱️ Simulating Apply to Canvas button click...');
            callback();
          }, 100);
        }
      };
    }
    if (id === 'copy-json-btn') {
      return {
        addEventListener: (event, callback) => {
          console.log('✅ Copy JSON button event listener added');
        }
      };
    }
    return null;
  },
  createElement: (tag) => ({
    className: '',
    innerHTML: '',
    addEventListener: () => {}
  })
};

global.navigator = {
  clipboard: {
    writeText: (text) => Promise.resolve()
  }
};

global.console = console;

// Mock functions that would be available in the browser
global.showMiniToast = (message) => {
  console.log('Toast:', message);
};

global.injectToCanvas = (json) => {
  console.log('✅ injectToCanvas called with:', JSON.stringify(json, null, 2));
};

// Load the workflow module
require('./modules/chatbot-workflow.js');

// Access functions from global window object
const extractJsonFromResponse = global.window.extractJsonFromResponse;
const processWorkflowJson = global.window.processWorkflowJson;

console.log('Testing JSON extraction from AI responses...\n');

// Test 1: AI response with properly formatted JSON
console.log('=== Test 1: AI response with JSON code block ===');
const aiResponse1 = `Here's the HTTP Request node you requested:

\`\`\`json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [300, 200],
      "parameters": {
        "url": "https://api.example.com",
        "method": "GET"
      }
    }
  ],
  "connections": {}
}
\`\`\`

This node will make a GET request to the specified URL.`;

const extractedJson1 = extractJsonFromResponse(aiResponse1);
console.log('Extracted JSON:', extractedJson1);

if (extractedJson1) {
  console.log('✅ JSON extraction successful');
  console.log('Processing workflow JSON...');
  processWorkflowJson(extractedJson1);
} else {
  console.log('❌ JSON extraction failed');
}

console.log('\n=== Test 2: AI response without JSON ===');
const aiResponse2 = `To create an HTTP Request node in n8n:

1. Click the "+" button to add a new node
2. Search for "HTTP Request"
3. Configure the URL and method
4. Connect it to your workflow

This will allow you to make HTTP requests to external APIs.`;

const extractedJson2 = extractJsonFromResponse(aiResponse2);
console.log('Extracted JSON:', extractedJson2);

if (extractedJson2) {
  console.log('❌ Unexpected JSON extraction from non-JSON response');
} else {
  console.log('✅ Correctly identified no JSON in response');
}

console.log('\n=== Test 3: AI response with malformed JSON ===');
const aiResponse3 = `Here's the node configuration:

\`\`\`json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [300, 200],
      "parameters": {
        "url": "https://api.example.com",
        "method": "GET",
      }
    }
  ],
  "connections": {}
}
\`\`\``;

const extractedJson3 = extractJsonFromResponse(aiResponse3);
console.log('Extracted JSON:', extractedJson3);

if (extractedJson3) {
  console.log('✅ JSON extraction successful (trailing comma handled)');
} else {
  console.log('❌ JSON extraction failed on malformed JSON');
}

console.log('\n=== Test 4: AI response with direct JSON (no code block) ===');
const aiResponse4 = `{"nodes":[{"name":"Merge","type":"n8n-nodes-base.merge","position":[400,300],"parameters":{"mode":"append"}}],"connections":{}}`;

const extractedJson4 = extractJsonFromResponse(aiResponse4);
console.log('Extracted JSON:', extractedJson4);

if (extractedJson4) {
  console.log('✅ Direct JSON extraction successful');
} else {
  console.log('❌ Direct JSON extraction failed');
}

console.log('\n=== JSON Extraction Test Summary ===');
console.log('Test 1 (JSON code block):', extractedJson1 ? '✅ PASS' : '❌ FAIL');
console.log('Test 2 (No JSON):', !extractedJson2 ? '✅ PASS' : '❌ FAIL');
console.log('Test 3 (Malformed JSON):', extractedJson3 ? '✅ PASS' : '❌ FAIL');
console.log('Test 4 (Direct JSON):', extractedJson4 ? '✅ PASS' : '❌ FAIL');

// Wait for async operations to complete
setTimeout(() => {
  console.log('\n🎉 JSON extraction tests completed!');
}, 200);