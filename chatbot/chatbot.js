// chatbot/chatbot.js

// Force isN8nPage to true for development purposes
// The isN8nPage check is now done directly in the toggleChat function.

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
  
  // Removed isN8nPageResponse handler as it's no longer needed.
  
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
});

// Function to communicate with content script
function sendToContentScript(data) {
  window.dispatchEvent(new CustomEvent('n8nCopilotInjectedEvent', {
    detail: data
  }));
}

// Get n8n page status, resource URLs, and settings
function initialize() {
  // Removed getIsN8nPage call.
  sendToContentScript({ type: 'getResourceURLs' });
  sendToContentScript({ type: 'getSettings' });
}

// Safely get resource URL
function getResourceURL(path) {
  if (window.extensionResources && window.extensionResources[path]) {
    return window.extensionResources[path];
  }
  return path; // Fallback
}

// Inject chat CSS if not already present
function injectChatStyles() {
  if (document.getElementById('n8n-builder-styles')) return;
  // Request the CSS URL from the content script
  sendToContentScript({ type: 'getResourceURL', path: 'chatbot/chatbot.css' });
}

function applyChatStyles(cssUrl) {
  const style = document.createElement('link');
  style.id = 'n8n-builder-styles';
  style.rel = 'stylesheet';
  style.type = 'text/css';
  style.href = cssUrl;
  document.head.appendChild(style);
}

// Inject the chat icon bubble
function injectChatIcon() {
  // Check if we have the resource URLs yet
  if (!window.extensionResources) {
    // If not, request them and return
    sendToContentScript({ type: 'getResourceURLs' });
    return;
  }
  
  // Remove existing icon if present
  const existingIcon = document.getElementById('n8n-builder-icon');
  if (existingIcon) existingIcon.remove();
  
  // Get the icon URL
  const iconUrl = getResourceURL('icons/chat-icon-48.png');
  
  // Create the chat icon
  const iconDiv = document.createElement('div');
  iconDiv.id = 'n8n-builder-icon';
  iconDiv.className = 'n8n-builder-chat-icon';
  iconDiv.innerHTML = `
    <img src="${iconUrl}" alt="n8n Co Pilot" />
  `;
  document.body.appendChild(iconDiv);
  
  // Add click event to the icon
  iconDiv.addEventListener('click', () => {
    toggleChat();
  });
}

// Create a mini toast notification
function showMiniToast(message) {
  const toast = document.createElement('div');
  toast.className = 'n8n-builder-mini-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }, 10);
}

// New function to check if the current page is an n8n page directly.
function isN8nPage() {
  const url = window.location.href;
  return url.includes('/workflow/') || url.includes('/execution/');
}

// Toggle chat visibility
function toggleChat() {
  console.log('toggleChat called');
  const existingChat = document.getElementById('n8n-builder-chat');
  if (existingChat) {
    console.log('Removing existing chat');
    existingChat.remove();
  } else {
    if (isN8nPage()) {
      initChatbot();
    } else {
      console.log('Not an n8n page, chat not opened.');
      // Optionally, provide user feedback that this feature is only for n8n pages.
      showMiniToast('This feature is for n8n pages only.');
    }
  }
}

// Inject chat HTML
function injectChatHtml(callback) {
  // Request the HTML from the content script
  sendToContentScript({ 
    type: 'getChatHtml', 
    callback: 'processChatHtml' 
  });
  
  // Store the callback to be called later
  window.processChatHtml = function(html) {
    const existingOverlay = document.getElementById('n8n-builder-chat');
    if (existingOverlay) existingOverlay.remove();
    
    // Create a proper DOM element from the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();
    
    // Append the first child (should be the chat container) to the document body
    const chatElement = tempDiv.firstElementChild;
    if (chatElement) {
      document.body.appendChild(chatElement);
      console.log('Chat HTML injected successfully');
    } else {
      console.error('Failed to parse chat HTML', html);
    }
    
    if (callback) callback();
  };
}

// Parse JSON from AI response
function extractJsonFromResponse(text) {
  // Look for JSON code blocks
  const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
  const matches = [...text.matchAll(jsonRegex)];
  
  if (matches.length > 0) {
    try {
      // Extract the JSON string and parse it
      const jsonString = matches[0][1];
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }
  
  return null;
}

// Process workflow JSON and prepare for canvas injection
function processWorkflowJson(json) {
  if (!json) return;
  
  // Show a confirmation message with the extracted JSON
  const confirmMsg = `I've extracted workflow components. Would you like to add them to your canvas?`;
  
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;
  
  const actionDiv = document.createElement('div');
  actionDiv.className = 'n8n-builder-message assistant-message action';
  actionDiv.innerHTML = `
    <div class="message-avatar assistant-avatar"></div>
    <div class="message-content">
      <p>${confirmMsg}</p>
      <div class="action-buttons">
        <button id="apply-workflow-btn" class="action-button primary">Apply to Canvas</button>
        <button id="copy-json-btn" class="action-button secondary">Copy JSON</button>
      </div>
    </div>
  `;
  messagesArea.appendChild(actionDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;
  
  // Add event listeners for the buttons
  document.getElementById('apply-workflow-btn').addEventListener('click', () => {
    console.log('Apply to Canvas button clicked!');
    injectToCanvas(json);
  });
  
  document.getElementById('copy-json-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
      .then(() => {
        showMiniToast('JSON copied to clipboard');
      })
      .catch(err => {
        console.error('Could not copy JSON: ', err);
      });
  });
}

function cleanWorkflowForPut(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
    staticData: workflow.staticData ?? null, // fallback to null if undefined
  };
}

// Inject workflow to n8n canvas
async function injectToCanvas(json) {
  console.log('injectToCanvas called with:', json);

  // 1. Get the workflow ID from the URL
  const url = window.location.href;
  const workflowIdMatch = url.match(/workflow\/([^/?]+)/);
  if (!workflowIdMatch) {
    showMiniToast('Unable to detect workflow ID from URL');
    return;
  }
  const workflowId = workflowIdMatch[1];
  console.log('Workflow ID:', workflowId);

  // 2. Check API URL and Key
  if (!n8nApiUrl || !n8nApiKey) {
    showMiniToast('Please set n8n API URL and key in settings');
    return;
  }

  try {
    // 3. Fetch the current workflow
    const getUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
    console.log('GET request to:', getUrl);
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    console.log('GET response status:', getResponse.status);
    const workflow = await getResponse.json();
    console.log('Current workflow object:', workflow);

    // 4. Merge the new nodes and connections
    const updatedWorkflow = mergeWorkflow(workflow, json);
    console.log('Updated workflow to send (before cleaning):', updatedWorkflow);

    // CLEAN THE WORKFLOW OBJECT HERE
    const cleanedWorkflow = cleanWorkflowForPut(updatedWorkflow);
    console.log('Cleaned workflow to send (PUT):', cleanedWorkflow);

    // 5. Update the workflow
    const putUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
    console.log('PUT request to:', putUrl);
    const updateResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      },
      body: JSON.stringify(cleanedWorkflow)
    });

    // Robustly parse the response body
    let putResponseBody;
    const contentType = updateResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      putResponseBody = await updateResponse.json();
    } else {
      putResponseBody = await updateResponse.text();
    }
    console.log('PUT response body:', putResponseBody);

    if (updateResponse.ok) {
      showMiniToast('Workflow updated successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      console.error('Failed to update workflow:', updateResponse.status, putResponseBody);
      throw new Error(`Failed to update workflow: ${updateResponse.status} - ${putResponseBody}`);
    }
  } catch (error) {
    console.error('Error updating workflow:', error);
    showMiniToast(`Error: ${error.message}`);
  }
}

// Merge new workflow components with existing workflow
function mergeWorkflow(currentWorkflow, newComponents) {
  const result = { ...currentWorkflow };
  
  // Add new nodes
  if (newComponents.nodes && Array.isArray(newComponents.nodes)) {
    // Find the highest node ID to ensure new IDs don't conflict
    let maxNodeId = 0;
    if (result.nodes) {
      result.nodes.forEach(node => {
        const idNumber = parseInt(node.id.replace('Node', ''), 10);
        if (!isNaN(idNumber) && idNumber > maxNodeId) {
          maxNodeId = idNumber;
        }
      });
    } else {
      result.nodes = [];
    }
    
    // Add new nodes with unique IDs
    newComponents.nodes.forEach((node, index) => {
      const newNode = {
        ...node,
        id: `Node${maxNodeId + index + 1}`
      };
      result.nodes.push(newNode);
    });
  }
  
  // Add new connections
  if (newComponents.connections && Object.keys(newComponents.connections).length > 0) {
    if (!result.connections) {
      result.connections = {};
    }
    
    // Merge connections
    Object.keys(newComponents.connections).forEach(nodeId => {
      if (!result.connections[nodeId]) {
        result.connections[nodeId] = {};
      }
      
      Object.keys(newComponents.connections[nodeId]).forEach(outputIndex => {
        if (!result.connections[nodeId][outputIndex]) {
          result.connections[nodeId][outputIndex] = [];
        }
        
        result.connections[nodeId][outputIndex] = [
          ...result.connections[nodeId][outputIndex],
          ...newComponents.connections[nodeId][outputIndex]
        ];
      });
    });
  }
  
  return result;
}

// Add a message to the chat
function addMessage(sender, text) {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `n8n-builder-message ${sender}-message`;
  messageDiv.innerHTML = `
    <div class="message-avatar ${sender}-avatar"></div>
    <div class="message-content">${text}</div>
  `;
  messagesArea.appendChild(messageDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;
  
  // Store message in memory
  chatMemory.push({
    role: sender === 'user' ? 'user' : 'assistant',
    content: text
  });
}

// Add loading indicator
function showLoadingIndicator() {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;
  
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'n8n-builder-loading';
  loadingDiv.className = 'n8n-builder-message assistant-message loading';
  loadingDiv.innerHTML = `
    <div class="message-avatar assistant-avatar"></div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  messagesArea.appendChild(loadingDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Remove loading indicator
function removeLoadingIndicator() {
  const loadingIndicator = document.getElementById('n8n-builder-loading');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Call OpenAI API
async function callOpenAI(prompt) {
  if (!apiKey) {
    addMessage('assistant', 'Error: Please add your OpenAI API key in the extension settings.');
    return;
  }
  
  showLoadingIndicator();
  
  try {
    // Include system message to guide the AI with enhanced n8n-specific instructions
    const messages = [
      {
        role: 'system',
        content: `You are n8n Co Pilot, an AI assistant specializing in n8n workflow automation.
Your goal is to help users build effective n8n workflows by providing guidance and generating workflow components.

When a user asks for a specific workflow or node, respond with both:
1. A natural language explanation of the solution
2. A JSON code block that can be directly added to their n8n workflow

For JSON workflow snippets, use the following format:
\`\`\`json
{
  "nodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "parameters": { ... },
      "position": [x, y]
    }
  ],
  "connections": { ... }
}
\`\`\`

Ensure the JSON is valid and follows n8n's schema. Only include nodes and connections that are explicitly requested.`
      },
      ...chatMemory
    ];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    removeLoadingIndicator();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      addMessage('assistant', `Error: ${data.error.message}`);
      return;
    }
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content;
      addMessage('assistant', aiResponse);
      
      // Extract and process JSON if present
      const extractedJson = extractJsonFromResponse(aiResponse);
      if (extractedJson) {
        processWorkflowJson(extractedJson);
      }
    } else {
      addMessage('assistant', 'I encountered an issue processing your request. Please try again.');
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    removeLoadingIndicator();
    addMessage('assistant', `Error: ${error.message || 'Failed to connect to OpenAI API'}`);
  }
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

// Get workflow data from the n8n page context
function getWorkflowFromPage() {
  console.log('Requesting workflow data from content script...');
  sendToContentScript({ type: 'getWorkflowData' });
  // The response will be handled by the workflowDataResponse event listener
}

// Set up event listeners
function setupEventListeners() {
  const sendButton = document.getElementById('n8n-builder-send');
  if (sendButton) {
    sendButton.addEventListener('click', handleSendMessage);
  }
  
  const inputField = document.getElementById('n8n-builder-input');
  if (inputField) {
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
  
  const closeButton = document.getElementById('n8n-builder-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const chat = document.getElementById('n8n-builder-chat');
      if (chat) chat.remove();
    });
  }
  
  const minimizeButton = document.getElementById('n8n-builder-minimize');
  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      const chat = document.getElementById('n8n-builder-chat');
      if (chat) chat.remove();
      // Show only the icon when minimized
      injectChatIcon();
    });
  }
  
  // Set up periodic connection testing with content script
  setInterval(testContentScriptConnection, 5000); // Test every 5 seconds
  
  // Also test when URL changes (for SPAs)
  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      testContentScriptConnection(); // Test connection after navigation
    }
  }, 1000);
  
  const clearButton = document.getElementById('n8n-builder-clear');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      // Clear chat memory and messages
      chatMemory = [];
      const messagesArea = document.getElementById('n8n-builder-messages');
      if (messagesArea) {
        messagesArea.innerHTML = '';
        // Add welcome message back
        if (!apiKey) {
          addMessage('assistant', 'Welcome! Please add your OpenAI API key in the extension settings to use the chat functionality.');
        } else {
          addMessage('assistant', 'Chat cleared. How can I help you build your n8n workflow?');
        }
      }
    });
  }
}

// Store communication status with content script
let contentScriptConnected = false;
let lastContentScriptResponse = 0;

// Update n8n page indicator to show communication status
function updateN8nPageIndicator(status = null) {
  const indicator = document.getElementById('n8n-page-indicator');
  console.log('Updating indicator, element found:', !!indicator, 'status:', status);
  
  let logMessage, isConnected;
  
  if (status === 'connected') {
    contentScriptConnected = true;
    lastContentScriptResponse = Date.now();
    isConnected = true;
    logMessage = 'Content script communication: CONNECTED';
  } else if (status === 'disconnected' || !contentScriptConnected) {
    isConnected = false;
    logMessage = 'Content script communication: DISCONNECTED';
  } else {
    // Check if we've received a response recently (within 10 seconds)
    const timeSinceLastResponse = Date.now() - lastContentScriptResponse;
    if (timeSinceLastResponse < 10000 && contentScriptConnected) {
      isConnected = true;
      logMessage = 'Content script communication: ACTIVE';
    } else {
      isConnected = false;
      logMessage = 'Content script communication: TIMEOUT';
    }
  }
  
  if (indicator) {
    const indicatorClass = isConnected ? 'n8n-detected' : 'n8n-not-detected';
    const title = isConnected ? 'Extension Connected - Can Access Page Data' : 'Extension Disconnected - Cannot Access Page Data';
    
    indicator.className = `n8n-page-indicator ${indicatorClass}`;
    indicator.title = title;
    console.log(`n8n Co Pilot v2.0 - ${logMessage} - Applied class: ${indicatorClass}`);
  } else {
    console.log('n8n Co Pilot v2.0 - Indicator element not found in DOM');
    // Fallback: Add status to chat header if indicator element doesn't exist
    addStatusToHeader(isConnected);
  }
}

// Fallback function to add status text to chat header
function addStatusToHeader(isConnected) {
  const header = document.getElementById('n8n-builder-header');
  if (header) {
    // Remove existing status
    const existingStatus = header.querySelector('.connection-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Add new status
    const statusElement = document.createElement('span');
    statusElement.className = 'connection-status';
    statusElement.style.cssText = `
      margin-left: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      ${isConnected ?
        'background: #4CAF50; color: white;' :
        'background: #f44336; color: white;'
      }
    `;
    statusElement.textContent = isConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
    statusElement.title = isConnected ?
      'Extension can access page data' :
      'Extension cannot access page data';
    
    header.appendChild(statusElement);
    console.log('Added fallback status indicator to header');
  }
}

// Test content script connection
function testContentScriptConnection() {
  console.log('Testing content script connection...');
  sendToContentScript({ type: 'ping' });
  
  // Set a timeout to check if we got a response
  setTimeout(() => {
    updateN8nPageIndicator();
  }, 1000);
}

// Initialize the chatbot
function initChatbot() {
  console.log('n8n Co Pilot v2.0 - initChatbot called');
  // First ensure we have the CSS
  if (!document.getElementById('n8n-builder-styles')) {
    console.log('Requesting CSS');
    // Get the CSS URL from the content script
    sendToContentScript({ type: 'getResourceURL', path: 'chatbot/chatbot.css' });
  }
  
  console.log('Requesting HTML');
  // Then inject the HTML and set up the chatbot
  injectChatHtml(() => {
    console.log('Setting up event listeners');
    setupEventListeners();
    
    // Test initial content script connection
    testContentScriptConnection();
    
    // Check if API key is set
    if (!apiKey) {
      addMessage('assistant', 'Welcome! Please add your OpenAI API key in the extension settings to use the chat functionality.');
    } else {
      addMessage('assistant', `Hello! I'm your n8n Copilot 🚀

I can help you with:
• n8n workflow design and best practices
• Node explanations and usage tips
• Automation strategies and patterns
• Troubleshooting and debugging
• API integrations and custom solutions

**Note:** Live workflow analysis is currently limited due to browser security restrictions, but I can assist with general n8n questions and provide guidance based on your specific needs.

What would you like to know about n8n?`);
    }
  });
}

// Initialize
console.log('Chatbot script initialized');
initialize();