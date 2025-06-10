// chatbot/chatbot.js

// Chat memory to maintain conversation context
let chatMemory = [];
let apiKey = null;
let n8nApiUrl = null;
let n8nApiKey = null;

// For accessing Chrome extension resources safely
const getExtensionURL = (path) => {
  // First try direct chrome.runtime method
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }

  // If we're in an injected script where chrome.runtime isn't directly available
  // we'll need to construct the URL differently or have the content script pass it to us

  // For testing/development - show an error rather than breaking silently
  console.error('Unable to access chrome.runtime.getURL');

  // Return a dummy path that will make the error visible but not break execution
  return path;
};

// Listen for events from the content script
window.addEventListener('n8nCopilotContentEvent', (event) => {
  const data = event.detail;
  console.log('Event from content script:', data);

  if (data.type === 'showChat') {
    toggleChat();
  }

  if (data.type === 'resourceURLs') {
    // Store the URLs provided by the content script
    window.extensionResources = data.resources;
    console.log('Got extension resources:', window.extensionResources);

    // Now that we have the resources, we can inject the icon
    injectChatStyles();
    injectChatIcon();
  }

  if (data.type === 'resourceURL') {
    console.log('Received resource URL:', data.path, data.url);
    if (data.path === 'chatbot/chatbot.css') {
      applyChatStyles(data.url);
    }
  }

  if (data.type === 'chatHtml') {
    console.log('Received chat HTML content');
    if (window.processChatHtml) {
      window.processChatHtml(data.html);
    }
  }

  if (data.type === 'workflowDataResponse') {
    console.log('Received workflow data response:', data);
    console.log('data.data exists:', !!data.data);
    console.log('data.data content:', data.data);
    console.log('data.data keys:', data.data ? Object.keys(data.data) : 'no data');
    console.log('data.data.nodes:', data.data?.nodes);
    console.log('data.data.name:', data.data?.name);
    console.log('data.data.id:', data.data?.id);

    // More flexible validation - accept any workflow data structure
    if (data.data && (
      data.data.nodes?.length > 0 ||
      data.data.name ||
      data.data.id ||
      Object.keys(data.data).length > 0
    )) {
      console.log('Processing workflow data with', data.data.nodes?.length || 0, 'nodes');
      const workflowPrompt = `
        The user wants a description of the current n8n workflow.
        Here is the workflow data:
        Workflow Name: ${data.data.name || 'Unnamed Workflow'}
        Workflow ID: ${data.data.id || 'No ID'}
        Nodes: ${data.data.nodes?.length > 0 ? JSON.stringify(data.data.nodes, null, 2) : 'No nodes found'}
        Connections: ${data.data.connections ? JSON.stringify(data.data.connections, null, 2) : 'No connections found'}

        ${data.data.nodes?.length > 0
          ? 'Please provide a concise, high-level summary of what this workflow does based on its nodes and connections.'
          : 'This appears to be an empty workflow. Please explain that the workflow currently has no nodes and suggest what the user might want to do next.'
        }
      `;
      addMessage('user', 'Describe this workflow'); // Add user message to chat history for context
      callOpenAI(workflowPrompt);
    } else {
      console.log('No valid workflow data found. data.data:', data.data);
      console.log('Validation failed - data.data keys:', data.data ? Object.keys(data.data) : 'no data');
      addMessage('assistant', `I can see you're working on an n8n workflow, but I'm currently unable to access the live workflow data due to browser security limitations.

**What I can help with instead:**
• General n8n questions and best practices
• Node explanations and usage tips
• Workflow design patterns and strategies
• Troubleshooting common n8n issues
• API and integration guidance

**For workflow-specific help:**
• Save your workflow and try the description feature again
• Share your workflow JSON for detailed analysis
• Ask specific questions about nodes or connections you're working with

Feel free to ask me anything about n8n - I'm here to help! 🚀`);
      console.error('Failed to retrieve workflow data.', data.error || 'No valid data structure found');
    }
  }

  if (data.type === 'n8nPageStatus') {
    console.log('Received n8n page status:', data.isN8nPage);
    updateN8nPageIndicator('connected');
  }

  if (data.type === 'pong') {
    console.log('Received pong from content script');
    updateN8nPageIndicator('connected');
  }

  // Handle settings updates including API key
  if (data.type === 'settingsUpdated') {
    console.log('Settings updated in chatbot');
    if (data.settings) {
      if (data.settings.openaiKey) {
        apiKey = data.settings.openaiKey;
        console.log('OpenAI API key updated');
      }
      if (data.settings.n8nApiUrl) {
        n8nApiUrl = data.settings.n8nApiUrl;
        console.log('n8n API URL updated');
      }
      if (data.settings.n8nApiKey) {
        n8nApiKey = data.settings.n8nApiKey;
        console.log('n8n API key updated');
      }
    }
  }

  // Handle rejectUnauthorized setting
  if (data.type === 'rejectUnauthorized') {
    window.rejectUnauthorized = data.value !== false; // Default to true
    console.log('rejectUnauthorized setting:', window.rejectUnauthorized);
  }
});

// Function to communicate with content script
function sendToContentScript(data) {
  window.dispatchEvent(new CustomEvent('n8nCopilotInjectedEvent', {
    detail: data
  }));
}

// Get n8n page status, resource URLs, and settings
function initialize() {
  sendToContentScript({ type: 'getResourceURLs' });
  sendToContentScript({ type: 'getSettings' });

  // Retrieve rejectUnauthorized setting from storage via content script
  sendToContentScript({ type: 'getRejectUnauthorized' });
}

// Safely get resource URL
function getResourceURL(path) {
  if (window.extensionResources && window.extensionResources[path]) {
    return window.extensionResources[path];
  }
  return path; // Fallback
}

// New function to check if the current page is an n8n page directly.
function isN8nPage() {
  const url = window.location.href;
  return url.includes('/workflow/') || url.includes('/execution/');
}

// Handle sending a message
function handleSendMessage() {
  const inputElement = document.getElementById('n8n-builder-input');
  if (!inputElement) return;

  const userMessage = inputElement.value.trim();
  if (userMessage) {
    addMessage('user', userMessage);
    inputElement.value = '';

    if (userMessage.toLowerCase().includes('describe this workflow')) {
      const workflow = getWorkflowFromPage();
      if (workflow) {
        const workflowDescription = `The current workflow is named "${workflow.name}". It has ${workflow.nodes.length} nodes and ${Object.keys(workflow.connections).length} connections.`;
        addMessage('assistant', workflowDescription);
      } else {
        addMessage('assistant', "I couldn't find any workflow information on this page.");
      }
    } else {
      callOpenAI(userMessage);
    }
  }
}

// Test the connection to the content script
function testContentScriptConnection() {
  sendToContentScript({ type: 'ping' });
}

// Initialize the chatbot when the script loads
initialize();