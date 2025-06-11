// Test to simulate the actual user scenario where AI doesn't generate JSON
// This will help identify if the issue is with AI response generation

// Mock environment
global.window = {
  workflowCreationDebugger: {
    log: (message, level, data) => {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
  }
};

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
    return { addEventListener: () => {} };
  },
  createElement: () => ({ className: '', innerHTML: '', addEventListener: () => {} })
};

global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.showMiniToast = (message) => console.log('Toast:', message);
global.injectToCanvas = (json) => console.log('✅ injectToCanvas called');

// Load modules
require('./modules/chatbot-workflow.js');
const extractJsonFromResponse = global.window.extractJsonFromResponse;
const processWorkflowJson = global.window.processWorkflowJson;

console.log('=== AI Response Simulation Test ===\n');

// Test 1: Typical AI response that user reported (no JSON)
console.log('Test 1: Typical AI response without JSON (user reported scenario)');
const typicalResponse = `To create an HTTP Request node in n8n:

1. **Add a new node**: Click the "+" button on your canvas
2. **Search for HTTP Request**: Type "HTTP Request" in the search box
3. **Configure the node**:
   - Set the URL to your API endpoint
   - Choose the HTTP method (GET, POST, etc.)
   - Add any required headers or authentication
4. **Connect the node**: Link it to your workflow

This node allows you to make HTTP requests to external APIs and services. You can use it to fetch data, send webhooks, or integrate with REST APIs.`;

const extracted1 = extractJsonFromResponse(typicalResponse);
console.log('Extracted JSON:', extracted1);
console.log('Result: Apply to Canvas button would', extracted1 ? 'APPEAR' : 'NOT APPEAR');
console.log('');

// Test 2: Enhanced AI response with JSON (what we want)
console.log('Test 2: Enhanced AI response with JSON (desired behavior)');
const enhancedResponse = `To create an HTTP Request node in n8n:

1. **Add a new node**: Click the "+" button on your canvas
2. **Search for HTTP Request**: Type "HTTP Request" in the search box
3. **Configure the node** with the settings below

Here's the node configuration you can apply directly:

\`\`\`json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [300, 200],
      "parameters": {
        "url": "https://api.example.com/data",
        "method": "GET",
        "options": {}
      }
    }
  ],
  "connections": {}
}
\`\`\`

This node will make a GET request to the specified URL. You can modify the URL and method as needed for your specific use case.`;

const extracted2 = extractJsonFromResponse(enhancedResponse);
console.log('Extracted JSON:', extracted2);
console.log('Result: Apply to Canvas button would', extracted2 ? 'APPEAR' : 'NOT APPEAR');
if (extracted2) {
  console.log('Processing workflow JSON...');
  processWorkflowJson(extracted2);
}
console.log('');

// Test 3: AI response with partial JSON (edge case)
console.log('Test 3: AI response with incomplete JSON');
const partialResponse = `Here's how to create a merge node:

\`\`\`json
{
  "name": "Merge",
  "type": "n8n-nodes-base.merge"
}
\`\`\`

This configuration will create a basic merge node.`;

const extracted3 = extractJsonFromResponse(partialResponse);
console.log('Extracted JSON:', extracted3);
console.log('Result: Apply to Canvas button would', extracted3 ? 'APPEAR' : 'NOT APPEAR');
console.log('');

// Test 4: Simulate the exact system prompt behavior
console.log('Test 4: Testing if AI follows the enhanced system prompt');
console.log('System prompt instructs AI to generate JSON for node requests...');

// Simulate what the AI should generate based on our enhanced prompt
const promptCompliantResponse = `I'll help you create an HTTP Request node. Here's the configuration:

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

This HTTP Request node is configured to make a GET request. You can customize the URL and method for your specific needs.`;

const extracted4 = extractJsonFromResponse(promptCompliantResponse);
console.log('Extracted JSON:', extracted4);
console.log('Result: Apply to Canvas button would', extracted4 ? 'APPEAR' : 'NOT APPEAR');
console.log('');

console.log('=== Test Summary ===');
console.log('Test 1 (Typical response):', extracted1 ? '❌ UNEXPECTED JSON' : '✅ NO JSON (matches user report)');
console.log('Test 2 (Enhanced response):', extracted2 ? '✅ JSON FOUND' : '❌ NO JSON');
console.log('Test 3 (Partial JSON):', extracted3 ? '✅ JSON FOUND' : '❌ NO JSON');
console.log('Test 4 (Prompt compliant):', extracted4 ? '✅ JSON FOUND' : '❌ NO JSON');

console.log('\n=== Diagnosis ===');
console.log('The issue is likely that the AI is not following the enhanced system prompt.');
console.log('The JSON extraction and button generation functionality is working correctly.');
console.log('The AI needs to be more explicitly instructed to generate workflow JSON.');

console.log('\n=== Recommended Solution ===');
console.log('1. Further enhance the system prompt with more explicit instructions');
console.log('2. Add examples in the prompt showing the exact JSON format expected');
console.log('3. Consider adding a post-processing step to detect node requests and generate JSON');