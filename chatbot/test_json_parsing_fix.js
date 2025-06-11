// Test script to verify JSON parsing fix handles comments
const fs = require('fs');

// Mock the extractJsonFromResponse function with the fix
function extractJsonFromResponse(text) {
  // Look for JSON code blocks
  const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
  const matches = [...text.matchAll(jsonRegex)];

  if (matches.length > 0) {
    try {
      // Extract the JSON string and clean it
      let jsonString = matches[0][1].trim();

      // Remove any trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

      // Remove JavaScript-style comments that break JSON parsing
      jsonString = jsonString.replace(/\/\/.*$/gm, ''); // Remove single-line comments
      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

      // Try to fix common JSON issues
      jsonString = jsonString.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes to unquoted keys

      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.error('JSON string was:', matches[0][1]);
      return null;
    }
  }

  return null;
}

console.log('🧪 Testing JSON Parsing Fix for Comments\n');

// Test case 1: JSON with single-line comments (the actual problem case)
const testCase1 = `
Here's the JSON configuration:

\`\`\`json
{
  "nodes": [
    {
      "name": "chattrigger1", //changed from "Chat_trigger"
      "type": "n8n-nodes-base.chatTrigger",
      "typeVersion": 1,
      "position": [300, 200],
      "parameters": {
        // node-specific parameters
      }
    }
  ],
  "connections": {}
}
\`\`\`
`;

console.log('📝 Test Case 1: JSON with single-line comments');
console.log('Input text contains:', testCase1.includes('//changed from') ? '✅ Comments found' : '❌ No comments');

const result1 = extractJsonFromResponse(testCase1);
if (result1) {
  console.log('✅ JSON parsed successfully!');
  console.log('📊 Parsed result:', JSON.stringify(result1, null, 2));
  console.log('🎯 Node name:', result1.nodes?.[0]?.name);
} else {
  console.log('❌ JSON parsing failed');
}

// Test case 2: JSON with multi-line comments
const testCase2 = `
\`\`\`json
{
  "nodes": [
    {
      "name": "Webhook_node",
      "type": "n8n-nodes-base.webhook",
      /* This is a multi-line comment
         that spans multiple lines */
      "typeVersion": 1,
      "position": [100, 100]
    }
  ],
  "connections": {}
}
\`\`\`
`;

console.log('\n📝 Test Case 2: JSON with multi-line comments');
const result2 = extractJsonFromResponse(testCase2);
if (result2) {
  console.log('✅ JSON parsed successfully!');
  console.log('🎯 Node name:', result2.nodes?.[0]?.name);
} else {
  console.log('❌ JSON parsing failed');
}

// Test case 3: Clean JSON (should still work)
const testCase3 = `
\`\`\`json
{
  "nodes": [
    {
      "name": "Clean_node",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 100]
    }
  ],
  "connections": {}
}
\`\`\`
`;

console.log('\n📝 Test Case 3: Clean JSON (control test)');
const result3 = extractJsonFromResponse(testCase3);
if (result3) {
  console.log('✅ JSON parsed successfully!');
  console.log('🎯 Node name:', result3.nodes?.[0]?.name);
} else {
  console.log('❌ JSON parsing failed');
}

console.log('\n🎯 Summary:');
console.log(`  Test 1 (single-line comments): ${result1 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Test 2 (multi-line comments): ${result2 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Test 3 (clean JSON): ${result3 ? '✅ PASS' : '❌ FAIL'}`);

if (result1 && result2 && result3) {
  console.log('\n🎉 All tests passed! JSON parsing fix is working correctly.');
} else {
  console.log('\n❌ Some tests failed. JSON parsing fix needs more work.');
}