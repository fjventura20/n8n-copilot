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
  // Removed getIsN8nPage call.
  sendToContentScript({ type: 'getResourceURLs' });
  sendToContentScript({ type: 'getSettings' });

  // Retrieve rejectUnauthorized setting from storage via content script
  // Since chrome.storage is not available in injected scripts
  sendToContentScript({ type: 'getRejectUnauthorized' });
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
      // Extract the JSON string and clean it
      let jsonString = matches[0][1].trim();
      
      // Remove any trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to fix common JSON issues
      jsonString = jsonString.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes to unquoted keys
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.error('JSON string was:', matches[0][1]);
      return null;
    }
  }
  
  // Also try to find JSON without code blocks
  const directJsonRegex = /\{[\s\S]*\}/g;
  const directMatches = [...text.matchAll(directJsonRegex)];
  
  for (const match of directMatches) {
    try {
      let jsonString = match[0].trim();
      
      // Remove any trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
      
      return JSON.parse(jsonString);
    } catch (error) {
      // Continue to next match
      continue;
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

  // 2. Check API URL and Key - if not available, try fallback mode
  if (!n8nApiUrl || !n8nApiKey) {
    console.log('API credentials not available, attempting fallback canvas injection');
    return injectToCanvasFallback(json);
  }

  // Allow HTTP for localhost/127.0.0.1, require HTTPS for other domains
  const isLocalhost = n8nApiUrl.includes('localhost') || n8nApiUrl.includes('127.0.0.1');
  if (!isLocalhost && !n8nApiUrl.startsWith('https://')) {
    console.log('Invalid API URL, attempting fallback canvas injection');
    return injectToCanvasFallback(json);
  }
  if (!n8nApiUrl.startsWith('http://') && !n8nApiUrl.startsWith('https://')) {
    console.log('Invalid API URL format, attempting fallback canvas injection');
    return injectToCanvasFallback(json);
  }

  try {
    // 3. Fetch the current workflow via the content script proxy
    const getUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
    console.log('Proxying GET request to:', getUrl);
    console.log('Sending message to content script...');
    const getResponse = await new Promise((resolve, reject) => {
      // Send message to content script using the existing communication pattern
      window.dispatchEvent(new CustomEvent('n8nCopilotInjectedEvent', {
        detail: {
          type: 'proxyFetch',
          url: getUrl,
          options: {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          }
        }
      }));

      // Listen for response from content script
      const responseHandler = (event) => {
        if (event.detail.type === 'proxyFetchResponse') {
          window.removeEventListener('n8nCopilotContentEvent', responseHandler);
          console.log('Received response from content script:', event.detail);
          if (event.detail.success) {
            resolve(event.detail.data);
          } else {
            reject(new Error(event.detail.error || 'No response from content script'));
          }
        }
      };
      
      window.addEventListener('n8nCopilotContentEvent', responseHandler);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('n8nCopilotContentEvent', responseHandler);
        reject(new Error('Timeout waiting for response from content script'));
      }, 30000);
    });

    console.log('Current workflow object:', getResponse);
    const workflow = getResponse;

    // 4. Merge the new nodes and connections
    const updatedWorkflow = mergeWorkflow(workflow, json);
    console.log('Updated workflow to send (before cleaning):', updatedWorkflow);

    // CLEAN THE WORKFLOW OBJECT HERE
    const cleanedWorkflow = cleanWorkflowForPut(updatedWorkflow);
    console.log('Cleaned workflow to send (PUT):', cleanedWorkflow);

    // 5. Update the workflow via the content script proxy (consistent with GET request)
    const putUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
    console.log('Proxying PUT request to:', putUrl);
    const updateResponse = await new Promise((resolve, reject) => {
      // Send message to content script using the existing communication pattern
      window.dispatchEvent(new CustomEvent('n8nCopilotInjectedEvent', {
        detail: {
          type: 'proxyFetch',
          url: putUrl,
          options: {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            },
            body: JSON.stringify(cleanedWorkflow)
          }
        }
      }));

      // Listen for response from content script
      const responseHandler = (event) => {
        if (event.detail.type === 'proxyFetchResponse') {
          window.removeEventListener('n8nCopilotContentEvent', responseHandler);
          console.log('Received PUT response from content script:', event.detail);
          if (event.detail.success) {
            resolve(event.detail.data);
          } else {
            reject(new Error(event.detail.error || 'No response from content script'));
          }
        }
      };
      
      window.addEventListener('n8nCopilotContentEvent', responseHandler);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('n8nCopilotContentEvent', responseHandler);
        reject(new Error('Timeout waiting for PUT response from content script'));
      }, 30000);
    });

    console.log('PUT response body:', updateResponse);

    // Since the background script now handles the ok check, we just check for presence of data
    if (updateResponse) {
        showMiniToast('Workflow updated successfully!');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } else {
        // The error is already logged by the catch block
        // No need to throw again, just avoid the success message.
    }
  } catch (error) {
    console.error('Error updating workflow via API:', error);
    console.log('Attempting fallback canvas injection due to API error');
    return injectToCanvasFallback(json);
  }
}

// Fallback canvas injection when API is not available
function injectToCanvasFallback(json) {
  console.log('Using fallback canvas injection method');
  
  try {
    // Try to find n8n canvas elements and inject directly
    const canvasContainer = document.querySelector('[data-test-id="canvas"]') ||
                           document.querySelector('.canvas-container') ||
                           document.querySelector('#canvas') ||
                           document.querySelector('.node-view');
    
    if (!canvasContainer) {
      showMiniToast('Canvas not found. Please ensure you are on an n8n workflow page.');
      return;
    }

    // Show the JSON in a copyable format as a fallback
    const jsonString = JSON.stringify(json, null, 2);
    
    // Create a modal with the JSON for manual copying
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      max-width: 600px;
      max-height: 400px;
      overflow: auto;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    modal.innerHTML = `
      <h3>Workflow Components (API Unavailable)</h3>
      <p>Copy this JSON and manually import it into your n8n workflow:</p>
      <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">${jsonString}</textarea>
      <div style="margin-top: 10px;">
        <button id="copyJsonBtn" style="margin-right: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy JSON</button>
        <button id="closeModalBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('copyJsonBtn').addEventListener('click', () => {
      const textarea = modal.querySelector('textarea');
      textarea.select();
      document.execCommand('copy');
      showMiniToast('JSON copied to clipboard!');
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Auto-close after 30 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 30000);
    
    showMiniToast('Workflow JSON ready for manual import');
    
  } catch (error) {
    console.error('Fallback injection failed:', error);
    showMiniToast('Unable to inject workflow. Please check console for details.');
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
    addMessage('assistant', 'OpenAI API key is not set. Please configure it in the extension settings.');
    return;
  }

  showLoadingIndicator();
  chatMemory.push({ role: 'user', content: prompt });

  try {
    const messages = [
      {
        role: 'system',
        content: `You are an n8n expert assistant.
        - Provide concise and accurate answers.
        - When asked to create a workflow, provide the JSON for the nodes and connections.
        - When asked to perform an action (e.g., rename a node), respond with a JSON object describing the command.
        - Example command: { "command": "rename_node", "oldName": "Webhook", "newName": "Test_Hook" }`
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
        model: 'gpt-4-1106-preview',
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;
    chatMemory.push({ role: 'assistant', content: assistantMessage });

    const commandJson = extractJsonFromResponse(assistantMessage);
    if (commandJson && commandJson.command) {
      handleN8nApiCommand(commandJson);
    } else {
      addMessage('assistant', assistantMessage);
      const workflowJson = extractJsonFromResponse(assistantMessage);
      if (workflowJson) {
        processWorkflowJson(workflowJson);
      }
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
  } finally {
    removeLoadingIndicator();
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