// chatbot/chatbot.js

  // Chat memory to maintain conversation context (last 5 conversations)
  // Make these globally accessible to avoid redeclaration issues
  window.chatMemory = window.chatMemory || [];
  window.MAX_CONVERSATIONS = window.MAX_CONVERSATIONS || 5;
  
// Global function to apply chat styles
  function applyChatStyles(cssUrl) {
    console.log('Applying chat styles with URL:', cssUrl);
    const style = document.createElement('link');
    style.id = 'n8n-builder-styles';
    style.rel = 'stylesheet';
    style.type = 'text/css';
    style.href = cssUrl;
    document.head.appendChild(style);
  }
  // Unified storage mechanism - use cookies as primary storage
  // Load chat history from unified storage on startup
  function loadChatHistoryUnified() {
    // DEBUG: Call chat history debugger if available
    if (window.chatHistoryDebugger) {
      window.chatHistoryDebugger.log('loadChatHistoryUnified called', 'debug');
    }
    
    console.log('Loading chat history from unified storage...');
    
    // Try cookies first (primary storage)
    const cookieKey = 'n8n-copilot-chat-memory';
    const cookieData = getCookie(cookieKey);
    
    // DEBUG: Log cookie retrieval
    if (window.chatHistoryDebugger) {
      window.chatHistoryDebugger.log('Cookie data retrieved', 'debug', {
        exists: !!cookieData,
        length: cookieData?.length || 0
      });
    }
    
    if (cookieData) {
      try {
        const parsedHistory = JSON.parse(cookieData);
        if (Array.isArray(parsedHistory)) {
          window.chatMemory = parsedHistory;
          console.log('Loaded chat history from cookie on startup:', window.chatMemory.length, 'messages');
          
          // DEBUG: Log successful cookie load
          if (window.chatHistoryDebugger) {
            window.chatHistoryDebugger.log('Cookie load successful', 'debug', {
              messagesCount: window.chatMemory.length,
              firstMessage: window.chatMemory[0]?.content?.substring(0, 50)
            });
          }
          
          return true;
        }
      } catch (error) {
        console.error('Failed to parse chat history from cookie:', error);
        
        // DEBUG: Log parse error
        if (window.chatHistoryDebugger) {
          window.chatHistoryDebugger.log('Cookie parse error', 'error', error.message);
        }
      }
    }
    
    // Fallback to localStorage for migration
    try {
      const localStorageData = localStorage.getItem('n8n-copilot-chat-memory');
      
      // DEBUG: Log localStorage check
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('localStorage fallback check', 'debug', {
          exists: !!localStorageData,
          length: localStorageData?.length || 0
        });
      }
      
      if (localStorageData) {
        const parsedHistory = JSON.parse(localStorageData);
        if (Array.isArray(parsedHistory)) {
          window.chatMemory = parsedHistory;
          console.log('Migrated chat history from localStorage on startup:', window.chatMemory.length, 'messages');
          
          // Save to cookie and clear localStorage to complete migration
          setCookie(cookieKey, localStorageData, 7);
          localStorage.removeItem('n8n-copilot-chat-memory');
          console.log('Migrated chat history from localStorage to cookie');
          
          // DEBUG: Log migration
          if (window.chatHistoryDebugger) {
            window.chatHistoryDebugger.log('localStorage migration completed', 'debug', {
              messagesCount: window.chatMemory.length
            });
          }
          
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load chat history from localStorage during migration:', error);
      
      // DEBUG: Log localStorage error
      if (window.chatHistoryDebugger) {
        window.chatHistoryDebugger.log('localStorage migration error', 'error', error.message);
      }
    }
    
    console.log('No chat history found in storage');
    
    // DEBUG: Log no data found
    if (window.chatHistoryDebugger) {
      window.chatHistoryDebugger.log('No chat history found in any storage', 'warn');
    }
    
    return false;
  }

  // Cookie utility functions
  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
    console.log('Setting cookie:', name, 'expires:', expires);
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Make cookie functions globally available
  window.setCookie = setCookie;
  window.getCookie = getCookie;

  // Load chat history on startup
  loadChatHistoryUnified();

  // Save chat history to cookies whenever it changes
  window.addEventListener('chatMemoryUpdated', () => {
    const cookieKey = 'n8n-copilot-chat-memory';
    setCookie(cookieKey, JSON.stringify(window.chatMemory), 7);
  });
  
  let chatMemory = window.chatMemory;
  const MAX_CONVERSATIONS = window.MAX_CONVERSATIONS;
  let apiKey = null;
  
  // Make API variables globally accessible
  window.n8nApiUrl = null;
  window.n8nApiKey = null;

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

    if (data.type === 'toggleChat') {
      toggleChat();
    }

    if (data.type === 'resourceURLs') {
      // Store the URLs provided by the content script
      window.extensionResources = data.resources;
      console.log('Got extension resources:', window.extensionResources);

      // Inject chat CSS if not already present
      if (!document.getElementById('n8n-builder-styles')) {
        const cssUrl = getResourceURL('chatbot/chatbot.css');
        if (cssUrl) {
          applyChatStyles(cssUrl);
        }
      }

      // Now that we have the resources, we can inject the icon
      injectChatIcon();
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
          window.n8nApiUrl = data.settings.n8nApiUrl;
          console.log('n8n API URL updated');
        }
        if (data.settings.n8nApiKey) {
          window.n8nApiKey = data.settings.n8nApiKey;
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
    if (typeof loadChatHistoryUnified !== 'function') {
      console.warn('loadChatHistoryUnified not yet available, delaying initialization');
      setTimeout(initialize, 50); // Try again after 50ms
      return;
    }

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
      // Limit chat memory to the last 5 conversations
      if (window.chatMemory && window.chatMemory.length > window.MAX_CONVERSATIONS) {
        window.chatMemory = window.chatMemory.slice(-window.MAX_CONVERSATIONS);
      }
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
        if (typeof callOpenAI === 'function') {
          callOpenAI(userMessage);
        } else {
          addMessage('assistant', 'OpenAI integration is not available. Please check your API configuration.');
        }
      }
    }
  }

  // Make handleSendMessage globally available
  window.handleSendMessage = handleSendMessage;

  // Test the connection to the content script
  function testContentScriptConnection() {
    sendToContentScript({ type: 'ping' });
  }

  // Initialize the chatbot when the script loads
  initialize();

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      chatMemory,
      MAX_CONVERSATIONS,
      handleSendMessage
    };
  }

  // Make additional functions globally available
  window.sendToContentScript = sendToContentScript;
  window.testContentScriptConnection = testContentScriptConnection;
  window.getResourceURL = getResourceURL;
  window.isN8nPage = isN8nPage;
  window.setCookie = setCookie;
  window.getCookie = getCookie;
  window.loadChatHistoryUnified = loadChatHistoryUnified;
  window.sendToContentScript = sendToContentScript;
  window.testContentScriptConnection = testContentScriptConnection;
  window.getResourceURL = getResourceURL;
  window.isN8nPage = isN8nPage;
// Inject the chat icon bubble
function injectChatIcon() {
  // Check if we have the resource URLs yet
  if (!window.extensionResources) {
    // If not, request them and return
    // Use the global sendToContentScript function
    if (typeof window.sendToContentScript === 'function') {
      window.sendToContentScript({ type: 'getResourceURLs' });
    } else {
      console.error('sendToContentScript function not available');
    }
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
