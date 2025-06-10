console.log('content.js loaded');

// Cache for extension resource URLs
const resourceURLCache = {};

// Inject the chatbot icon script on all pages
function injectChatbotScript() {
  // Check if chatbot scripts are already loaded
  if (!document.getElementById('n8n-builder-chatbot-script')) {
    // Inject chatbot script
    const script = document.createElement('script');
    script.id = 'n8n-builder-chatbot-script';
    script.src = chrome.runtime.getURL('chatbot/chatbot.js');
    document.head.appendChild(script);
    console.log('Chatbot script injected');
  }
}

// Get all required resource URLs
function getResourceURLs() {
  return {
    'chatbot/chatbot.css': chrome.runtime.getURL('chatbot/chatbot.css'),
    'chatbot/chatbot.html': chrome.runtime.getURL('chatbot/chatbot.html'),
    'action/icons/chat-icon-48.png': chrome.runtime.getURL('action/icons/chat-icon-48.png')
  };
}

// Fetch content of a file
function fetchResource(path) {
  return fetch(chrome.runtime.getURL(path))
    .then(response => response.text());
}

// Cache and debounce mechanism
let workflowDataCache = null;
let lastWorkflowDataRequest = 0;
const WORKFLOW_DATA_CACHE_DURATION = 5000; // 5 seconds

// Function to check if current page is n8n
function checkIfN8nPage() {
  // Check URL patterns
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (url.includes('n8n.io') || hostname.includes('n8n') || url.includes('/workflow/')) {
    return true;
  }
  
  // Check for n8n-specific DOM elements
  const n8nElements = [
    'div[data-test-id="canvas"]',
    '.n8n-canvas',
    '#n8n-app',
    '[data-test-id="workflow-canvas"]',
    '.workflow-canvas',
    '.n8n-workflow-canvas',
    '[data-test-id="node-view"]'
  ];
  
  for (const selector of n8nElements) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // Check for Vue app with n8n store (this is what the content script can access)
  if (window.Vue && window.Vue.$store && window.Vue.$store.state) {
    return true;
  }
  
  // Check for n8n specific global variables
  if (window.n8n || window.N8N || window.__n8n) {
    return true;
  }
  
  return false;
}

// Robust function to get workflow data from n8n page
function getWorkflowDataFromPage() {
  const now = Date.now();
  
  // Return cached data if recent
  if (workflowDataCache && (now - lastWorkflowDataRequest) < WORKFLOW_DATA_CACHE_DURATION) {
    console.log('Returning cached workflow data');
    return workflowDataCache;
  }
  
  console.log('Attempting to get workflow data from n8n page...');
  lastWorkflowDataRequest = now;
  
  // Method 1: Try Vue.js store access (original method)
  try {
    const appElement = document.querySelector('#app');
    if (appElement && appElement.__vue__) {
      const vueInstance = appElement.__vue__;
      if (vueInstance.$store && vueInstance.$store.getters) {
        // Try different getter names that n8n might use
        const possibleGetters = ['workflow', 'getWorkflow', 'currentWorkflow', 'activeWorkflow'];
        for (const getter of possibleGetters) {
          if (vueInstance.$store.getters[getter]) {
            console.log(`Method 1: Found workflow data via Vue store getter '${getter}'`);
            const workflowData = vueInstance.$store.getters[getter];
            workflowDataCache = workflowData;
            return workflowData;
          }
        }
      }
    }
  } catch (error) {
    console.log('Method 1 failed:', error.message);
  }

  // Method 2: Try alternative Vue instance access with multiple selectors
  try {
    const selectors = [
      '[data-cy="workflow-canvas"]',
      '.workflow-canvas',
      '#workflow-canvas',
      '.n8n-canvas',
      '[data-test-id="canvas"]'
    ];
    
    for (const selector of selectors) {
      const vueApp = document.querySelector(selector);
      if (vueApp && vueApp.__vue__) {
        const vueInstance = vueApp.__vue__;
        if (vueInstance.$store && vueInstance.$store.getters) {
          const possibleGetters = ['workflow', 'getWorkflow', 'currentWorkflow', 'activeWorkflow'];
          for (const getter of possibleGetters) {
            if (vueInstance.$store.getters[getter]) {
              console.log(`Method 2: Found workflow data via ${selector} Vue instance getter '${getter}'`);
              return vueInstance.$store.getters[getter];
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('Method 2 failed:', error.message);
  }

  // Method 3: Try to find Vue instance in any element with __vue__ (limited search)
  try {
    const elementsWithVue = document.querySelectorAll('[id], [class*="vue"], [class*="app"], [class*="workflow"]');
    for (let element of elementsWithVue) {
      try {
        if (element && element.__vue__ && element.__vue__.$store) {
          const store = element.__vue__.$store;
          if (store && store.getters) {
            const possibleGetters = ['workflow', 'getWorkflow', 'currentWorkflow', 'activeWorkflow'];
            for (const getter of possibleGetters) {
              if (store.getters[getter]) {
                console.log(`Method 3: Found workflow data via element Vue instance getter '${getter}'`);
                const workflowData = store.getters[getter];
                workflowDataCache = workflowData;
                return workflowData;
              }
            }
          }
        }
      } catch (elementError) {
        // Silently continue to next element if this one fails
        continue;
      }
    }
  } catch (error) {
    console.log('Method 3 failed:', error.message);
  }

  // Method 4: Try to access global Vue instance and app instances
  try {
    // Check for Vue 3 global app instances
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ && window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps) {
      const apps = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps;
      for (const app of apps) {
        if (app.config && app.config.globalProperties && app.config.globalProperties.$store) {
          const store = app.config.globalProperties.$store;
          if (store.getters) {
            const possibleGetters = ['workflow', 'getWorkflow', 'currentWorkflow', 'activeWorkflow'];
            for (const getter of possibleGetters) {
              if (store.getters[getter]) {
                console.log(`Method 4: Found workflow data via Vue 3 app instance getter '${getter}'`);
                return store.getters[getter];
              }
            }
          }
        }
      }
    }
    
    // Check for Vue 2 global instance
    if (window.Vue && window.Vue.prototype && window.Vue.prototype.$store) {
      const store = window.Vue.prototype.$store;
      if (store.getters) {
        const possibleGetters = ['workflow', 'getWorkflow', 'currentWorkflow', 'activeWorkflow'];
        for (const getter of possibleGetters) {
          if (store.getters[getter]) {
            console.log(`Method 4: Found workflow data via global Vue getter '${getter}'`);
            return store.getters[getter];
          }
        }
      }
    }
  } catch (error) {
    console.log('Method 4 failed:', error.message);
  }

  // Method 5: Try to parse workflow data from DOM elements or script tags
  try {
    // Look for workflow data in script tags
    const scriptTags = document.querySelectorAll('script');
    for (let script of scriptTags) {
      if (script.textContent && script.textContent.includes('workflow')) {
        // Try to extract workflow data from script content
        const workflowMatch = script.textContent.match(/workflow["\s]*:["\s]*({[^}]+})/);
        if (workflowMatch) {
          console.log('Method 5: Found workflow data in script tag');
          return JSON.parse(workflowMatch[1]);
        }
      }
    }
  } catch (error) {
    console.log('Method 5 failed:', error.message);
  }

  // Method 6: Try to get workflow data from URL and make assumptions
  try {
    const url = window.location.href;
    const workflowIdMatch = url.match(/workflow\/([^/?]+)/);
    if (workflowIdMatch) {
      console.log('Method 6: Creating minimal workflow data from URL');
      const workflowData = {
        name: `Workflow ${workflowIdMatch[1]}`,
        nodes: [],
        connections: {},
        id: workflowIdMatch[1]
      };
      workflowDataCache = workflowData;
      return workflowData;
    }
  } catch (error) {
    console.log('Method 6 failed:', error.message);
  }

  console.log('All methods failed to retrieve workflow data');
  return null;
}

// Setup communication bridge between content script and injected script
function setupCommunicationBridge() {
  // Listen for events from the injected script
  window.addEventListener('n8nCopilotInjectedEvent', async (event) => {
    const data = event.detail;
    console.log('Event from injected script:', data);

    // Handle various requests from the injected script
    switch (data.type) {
      // This case is no longer needed as page detection is handled in chatbot.js

      case 'getResourceURLs':
        window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
          detail: {
            type: 'resourceURLs',
            resources: getResourceURLs()
          }
        }));
        break;

      case 'getResourceURL':
        const url = chrome.runtime.getURL(data.path);
        resourceURLCache[data.path] = url;
        window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
          detail: {
            type: 'resourceURL',
            path: data.path,
            url: url
          }
        }));
        break;

      case 'proxyFetch':
        console.log('Content script: Proxying fetch request to background script');
        try {
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'proxyFetch',
              url: data.url,
              options: data.options
            }, response => {
              if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                return reject(chrome.runtime.lastError);
              }
              resolve(response);
            });
          });

          console.log('Content script: Received response from background script:', response);
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'proxyFetchResponse',
              success: response.success,
              data: response.data,
              error: response.error
            }
          }));
        } catch (error) {
          console.error('Content script: Error in proxy fetch:', error);
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'proxyFetchResponse',
              success: false,
              error: error.toString()
            }
          }));
        }
        break;

      case 'getChatHtml':
        const html = await fetchResource('chatbot/chatbot.html');
        window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
          detail: {
            type: 'chatHtml',
            html: html
          }
        }));
        // If a callback was specified, call it with the HTML
        if (data.callback && window[data.callback]) {
          window[data.callback](html);
        }
        break;

      case 'getWorkflowData':
        try {
          console.log('Getting workflow data from n8n page...');
          const workflowData = getWorkflowDataFromPage();
          
          if (workflowData) {
            console.log('Found workflow data:', workflowData);
            window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
              detail: {
                type: 'workflowDataResponse',
                data: {
                  name: workflowData.name || 'Untitled Workflow',
                  nodes: workflowData.nodes || [],
                  connections: workflowData.connections || {},
                }
              }
            }));
          } else {
            throw new Error('Workflow data is not available on this page.');
          }
        } catch (error) {
          console.error('Error getting workflow data:', error);
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'workflowDataResponse',
              data: null,
              error: error.message
            }
          }));
        }
        break;

      case 'checkN8nPage':
        try {
          console.log('Checking if current page is n8n...');
          const isN8nPage = checkIfN8nPage();
          console.log('n8n page check result:', isN8nPage);
          
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'n8nPageStatus',
              isN8nPage: isN8nPage
            }
          }));
        } catch (error) {
          console.error('Error checking n8n page status:', error);
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'n8nPageStatus',
              isN8nPage: false
            }
          }));
        }
        break;

      case 'ping':
        console.log('Content script: Received ping, sending pong');
        window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
          detail: {
            type: 'pong'
          }
        }));
        break;

      case 'getSettings':
        chrome.storage.sync.get(['openaiKey', 'anthropicKey', 'activeProvider', 'n8nApiUrl', 'n8nApiKey'], (result) => {
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'settingsUpdated',
              settings: {
                openaiKey: result.openaiKey || '',
                anthropicKey: result.anthropicKey || '',
                activeProvider: result.activeProvider || 'openai',
                n8nApiUrl: result.n8nApiUrl || '',
                n8nApiKey: result.n8nApiKey || ''
              }
            }
          }));
        });
        break;

      case 'getRejectUnauthorized':
        chrome.storage.sync.get('rejectUnauthorized', (result) => {
          window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
            detail: {
              type: 'rejectUnauthorized',
              value: result.rejectUnauthorized
            }
          }));
        });
        break;
    }
  });
}

// Listen for messages from extension.js or settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);

  // Handle the showChat action from settings
  if (request.action === 'showChat') {
    console.log('Show chat action received');

    // Make sure the chatbot script is injected
    injectChatbotScript();

    // Send a custom event to the injected script to show chat
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
        detail: {
          type: 'showChat'
        }
      }));
    }, 200); // Longer delay to ensure script is loaded
  }

  // Pass settings updates to the injected script
  if (request.action === 'settingsUpdated') {
    window.dispatchEvent(new CustomEvent('n8nCopilotContentEvent', {
      detail: {
        type: 'settingsUpdated',
        settings: request.settings
      }
    }));
  }

  sendResponse({ status: 'received' });
  return true;
});

// Initialize
injectChatbotScript();
setupCommunicationBridge();

// The isN8nPage check is no longer performed in the content script.