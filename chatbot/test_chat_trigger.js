// Test file for chat trigger functionality
// This file tests the chat trigger creation and injection capabilities

// Mock DOM elements for testing
const mockDOM = {
  getElementById: (id) => {
    if (id === 'n8n-builder-messages') {
      return {
        appendChild: (element) => console.log('Appended element to messages area'),
        scrollTop: 0,
        scrollHeight: 100
      };
    }
    return null;
  },
  createElement: (tag) => ({
    className: '',
    innerHTML: '',
    addEventListener: (event, handler) => console.log(`Added ${event} listener`)
  })
};

// Mock global objects
global.document = mockDOM;
global.console = console;
global.navigator = {
  clipboard: {
    writeText: (text) => Promise.resolve(console.log('Copied to clipboard:', text))
  }
};

// Mock window object
global.window = {
  location: { href: 'https://app.n8n.io/workflow/123' },
  // Add the functions to window object as they would be in the browser
  createChatTriggerNode: null,
  mergeWorkflow: null,
  addChatTrigger: null
};

// Load the chatbot workflow module
require('./modules/chatbot-workflow.js');

// Extract functions from window object
const { createChatTriggerNode, mergeWorkflow, addChatTrigger } = global.window;

// Test chat trigger creation
console.log('Testing chat trigger creation...');

// Test different platforms
const platforms = ['slack', 'discord', 'mattermost', 'webhook'];

platforms.forEach(platform => {
  console.log(`\nTesting ${platform} trigger:`);
  const trigger = createChatTriggerNode(platform, { x: 100, y: 100 });
  console.log('Created trigger:', JSON.stringify(trigger, null, 2));
});

// Test workflow merging
console.log('\nTesting workflow merging...');
const existingWorkflow = {
  nodes: [
    { name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0] }
  ],
  connections: {}
};

const newTrigger = {
  nodes: [createChatTriggerNode('slack', { x: 200, y: 100 })],
  connections: {}
};

const mergedWorkflow = mergeWorkflow(existingWorkflow, newTrigger);
console.log('Merged workflow:', JSON.stringify(mergedWorkflow, null, 2));

// Test addChatTrigger function
console.log('\nTesting addChatTrigger function...');
addChatTrigger('slack').then(() => {
  console.log('Chat trigger added successfully');
}).catch(error => {
  console.error('Error adding chat trigger:', error);
});

console.log('\nAll tests completed!');