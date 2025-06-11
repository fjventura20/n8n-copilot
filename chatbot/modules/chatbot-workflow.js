// chatbot/modules/chatbot-workflow.js

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

  // Also try to find JSON without code blocks
  const directJsonRegex = /\{[\s\S]*\}/g;
  const directMatches = [...text.matchAll(directJsonRegex)];

  for (const match of directMatches) {
    try {
      let jsonString = match[0].trim();

      // Remove any trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

      // Remove JavaScript-style comments that break JSON parsing
      jsonString = jsonString.replace(/\/\/.*$/gm, ''); // Remove single-line comments
      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

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
  // DEBUG: Call workflow debugger if available
  if (window.workflowCreationDebugger) {
    window.workflowCreationDebugger.log('processWorkflowJson called', 'debug', {
      jsonExists: !!json,
      jsonType: typeof json,
      hasNodes: !!(json?.nodes),
      nodesCount: json?.nodes?.length || 0,
      hasConnections: !!(json?.connections)
    });
  }

  if (!json) {
    // DEBUG: Log missing JSON
    if (window.workflowCreationDebugger) {
      window.workflowCreationDebugger.log('processWorkflowJson called with no JSON', 'warn');
    }
    return;
  }

  // Show a confirmation message with the extracted JSON
  const confirmMsg = `I've extracted workflow components. Would you like to add them to your canvas?`;

  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) {
    // DEBUG: Log missing messages area
    if (window.workflowCreationDebugger) {
      window.workflowCreationDebugger.log('Messages area not found in processWorkflowJson', 'error');
    }
    return;
  }

  // DEBUG: Log UI creation
  if (window.workflowCreationDebugger) {
    window.workflowCreationDebugger.log('Creating workflow action buttons', 'debug', {
      messagesAreaChildren: messagesArea.children.length
    });
  }

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
    // DEBUG: Enhanced logging for canvas injection
    if (window.workflowCreationDebugger) {
      window.workflowCreationDebugger.log('Apply to Canvas button clicked', 'info', {
        jsonToInject: {
          name: json.name,
          nodesCount: json.nodes?.length || 0,
          connectionsCount: Object.keys(json.connections || {}).length
        },
        currentUrl: window.location.href,
        apiConfigured: !!(window.n8nApiUrl && window.n8nApiKey)
      });
    }

    console.log('=== CANVAS INJECTION DEBUG ===');
    console.log('Apply to Canvas button clicked!');
    console.log('JSON to inject:', json);
    console.log('Current URL:', window.location.href);
    console.log('n8nApiUrl available:', !!window.n8nApiUrl);
    console.log('n8nApiKey available:', !!window.n8nApiKey);
    console.log('injectToCanvas function available:', typeof injectToCanvas);
    console.log('Starting canvas injection...');
    
    try {
      injectToCanvas(json);
      console.log('Canvas injection function called successfully');
      
      // DEBUG: Log successful call
      if (window.workflowCreationDebugger) {
        window.workflowCreationDebugger.log('injectToCanvas called successfully', 'debug');
      }
    } catch (error) {
      console.error('Error calling injectToCanvas:', error);
      
      // DEBUG: Log injection error
      if (window.workflowCreationDebugger) {
        window.workflowCreationDebugger.log('injectToCanvas call failed', 'error', error.message);
      }
    }
  });

  document.getElementById('copy-json-btn').addEventListener('click', () => {
    // DEBUG: Log copy action
    if (window.workflowCreationDebugger) {
      window.workflowCreationDebugger.log('Copy JSON button clicked', 'debug', {
        jsonSize: JSON.stringify(json).length
      });
    }

    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
      .then(() => {
        showMiniToast('JSON copied to clipboard');
        
        // DEBUG: Log successful copy
        if (window.workflowCreationDebugger) {
          window.workflowCreationDebugger.log('JSON copied to clipboard successfully', 'debug');
        }
      })
      .catch(err => {
        console.error('Could not copy JSON: ', err);
        
        // DEBUG: Log copy error
        if (window.workflowCreationDebugger) {
          window.workflowCreationDebugger.log('JSON copy failed', 'error', err.message);
        }
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
  // DEBUG: Call workflow debugger if available
  if (window.workflowCreationDebugger) {
    window.workflowCreationDebugger.log('injectToCanvas called', 'info', {
      jsonExists: !!json,
      jsonType: typeof json,
      hasNodes: !!(json?.nodes),
      nodesCount: json?.nodes?.length || 0,
      hasConnections: !!(json?.connections),
      currentUrl: window.location.href,
      apiConfigured: !!(window.n8nApiUrl && window.n8nApiKey)
    });
  }

  console.log('=== INJECT TO CANVAS FUNCTION START ===');
  console.log('injectToCanvas called with:', json);
  console.log('Function execution timestamp:', new Date().toISOString());

  // Validate input JSON
  if (!json || typeof json !== 'object') {
    console.error('❌ Invalid JSON provided to injectToCanvas:', json);
    showMiniToast('Invalid workflow data provided');
    
    // DEBUG: Log validation failure
    if (window.workflowCreationDebugger) {
      window.workflowCreationDebugger.log('JSON validation failed', 'error', {
        json,
        jsonType: typeof json
      });
    }
    return;
  }
  console.log('✅ JSON validation passed');

  // DEBUG: Log validation success
  if (window.workflowCreationDebugger) {
    window.workflowCreationDebugger.log('JSON validation passed', 'debug', {
      name: json.name,
      nodesCount: json.nodes?.length || 0,
      connectionsKeys: Object.keys(json.connections || {}).length
    });
  }

  // Show loading indicator
  console.log('📊 Showing loading indicator...');
  if (typeof showLoadingIndicator === 'function') {
    showLoadingIndicator();
    console.log('✅ Loading indicator shown');
  } else {
    console.error('❌ showLoadingIndicator function not available');
  }
  
  console.log('💬 Adding assistant message...');
  if (typeof addMessage === 'function') {
    addMessage('assistant', 'Applying workflow to canvas...');
    console.log('✅ Assistant message added');
  } else {
    console.error('❌ addMessage function not available');
  }

  try {
    console.log('🔍 Step 1: Extracting workflow ID from URL...');
    // 1. Get the workflow ID from the URL
    const url = window.location.href;
    console.log('Current URL:', url);
    const workflowIdMatch = url.match(/workflow\/([^/?]+)/);
    if (!workflowIdMatch) {
      console.error('❌ Unable to detect workflow ID from URL');
      throw new Error('Unable to detect workflow ID from URL. Please ensure you are on a workflow page.');
    }
    const workflowId = workflowIdMatch[1];
    console.log('✅ Workflow ID extracted:', workflowId);

    // Handle "new" workflow case - create a new workflow via API
    if (workflowId === 'new') {
      console.log('🆕 Detected new workflow, attempting to create via API');
      if (typeof removeLoadingIndicator === 'function') {
        removeLoadingIndicator();
      }
      return injectToNewWorkflow(json);
    }

    console.log('🔑 Step 2: Checking API credentials...');
    // 2. Check API URL and Key - if not available, try fallback mode
    console.log('n8nApiUrl value:', window.n8nApiUrl);
    console.log('n8nApiKey exists:', !!window.n8nApiKey);
    console.log('n8nApiKey type:', typeof window.n8nApiKey);
    
    if (!window.n8nApiUrl || !window.n8nApiKey) {
      console.log('❌ API credentials not available, attempting fallback canvas injection');
      console.log('Missing credentials - n8nApiUrl:', window.n8nApiUrl);
      console.log('Missing credentials - n8nApiKey exists:', !!window.n8nApiKey);
      if (typeof removeLoadingIndicator === 'function') {
        removeLoadingIndicator();
      }
      return injectToCanvasFallback(json);
    }
    console.log('✅ API credentials available');

    // Use global variables for API credentials
    const apiUrl = window.n8nApiUrl;
    const apiKey = window.n8nApiKey;

    // Allow HTTP for localhost/127.0.0.1, require HTTPS for other domains
    const isLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
    if (!isLocalhost && !apiUrl.startsWith('https://')) {
      console.log('Invalid API URL (non-HTTPS for non-localhost), attempting fallback canvas injection');
      removeLoadingIndicator();
      return injectToCanvasFallback(json);
    }
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      console.log('Invalid API URL format, attempting fallback canvas injection');
      removeLoadingIndicator();
      return injectToCanvasFallback(json);
    }

    console.log('🌐 Step 3: Fetching current workflow via API...');
    // 3. Fetch the current workflow via the content script proxy
    const getUrl = `${apiUrl}/api/v1/workflows/${workflowId}`;
    console.log('GET URL:', getUrl);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('Sending GET request via proxyFetch...');
    
    const getResponse = await proxyFetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey
      }
    });

    console.log('✅ GET response received:', getResponse);
    console.log('Response type:', typeof getResponse);
    console.log('Response keys:', getResponse ? Object.keys(getResponse) : 'no response');
    
    if (!getResponse || typeof getResponse !== 'object') {
      console.error('❌ Invalid workflow response from API');
      throw new Error('Failed to retrieve current workflow data from API');
    }

    const workflow = getResponse;
    console.log('Current workflow nodes count:', workflow.nodes?.length || 0);

    console.log('🔄 Step 4: Merging workflow components...');
    // 4. Merge the new nodes and connections
    const updatedWorkflow = mergeWorkflow(workflow, json);
    console.log('Updated workflow nodes count:', updatedWorkflow.nodes?.length || 0);
    console.log('Updated workflow (before cleaning):', updatedWorkflow);

    console.log('🧹 Step 5: Cleaning workflow object...');
    // CLEAN THE WORKFLOW OBJECT HERE
    const cleanedWorkflow = cleanWorkflowForPut(updatedWorkflow);
    console.log('Cleaned workflow to send (PUT):', cleanedWorkflow);

    console.log('📤 Step 6: Sending PUT request to update workflow...');
    // 5. Update the workflow via the content script proxy (consistent with GET request)
    const putUrl = `${apiUrl}/api/v1/workflows/${workflowId}`;
    console.log('PUT URL:', putUrl);
    console.log('PUT body size:', JSON.stringify(cleanedWorkflow).length, 'characters');
    
    const updateResponse = await proxyFetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey
      },
      body: JSON.stringify(cleanedWorkflow)
    });

    console.log('✅ PUT response received:', updateResponse);
    console.log('=== CANVAS INJECTION SUCCESS ===');
    
    if (typeof removeLoadingIndicator === 'function') {
      removeLoadingIndicator();
    }
    if (typeof showMiniToast === 'function') {
      showMiniToast('Workflow updated successfully!');
    }
    if (typeof addMessage === 'function') {
      addMessage('assistant', '✅ Successfully applied workflow components to canvas! The workflow has been updated with your new nodes.');
    }

  } catch (error) {
    console.error('=== CANVAS INJECTION ERROR ===');
    console.error('Error injecting to canvas:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (typeof removeLoadingIndicator === 'function') {
      removeLoadingIndicator();
    }
    if (typeof showMiniToast === 'function') {
      showMiniToast(`Error: ${error.message}`);
    }
    if (typeof addMessage === 'function') {
      addMessage('assistant', `❌ Failed to apply to canvas: ${error.message}\n\nFalling back to manual import option...`);
    }
    
    console.log('🔄 Falling back to manual import...');
    if (typeof injectToCanvasFallback === 'function') {
      injectToCanvasFallback(json);
    } else {
      console.error('❌ injectToCanvasFallback function not available');
    }
  }
  
  console.log('=== INJECT TO CANVAS FUNCTION END ===');
}

// Get workflow data from the n8n page context
function getWorkflowFromPage() {
  console.log('Requesting workflow data from content script...');
  sendToContentScript({ type: 'getWorkflowData' });
  // The response will be handled by the workflowDataResponse event listener
}

// Merge new workflow components with existing workflow
function mergeWorkflow(existingWorkflow, newComponents) {
  const merged = {
    ...existingWorkflow,
    nodes: [...(existingWorkflow.nodes || [])],
    connections: {...(existingWorkflow.connections || {})}
  };

  // Add new nodes
  if (newComponents.nodes) {
    newComponents.nodes.forEach(newNode => {
      // Ensure unique node names
      let nodeName = newNode.name;
      let counter = 1;
      while (merged.nodes.find(n => n.name === nodeName)) {
        nodeName = `${newNode.name}_${counter}`;
        counter++;
      }
      newNode.name = nodeName;
      merged.nodes.push(newNode);
    });
  }

  // Add new connections
  if (newComponents.connections) {
    Object.keys(newComponents.connections).forEach(nodeKey => {
      if (!merged.connections[nodeKey]) {
        merged.connections[nodeKey] = {};
      }
      Object.assign(merged.connections[nodeKey], newComponents.connections[nodeKey]);
    });
  }

  return merged;
}

// Create a new workflow via N8N API for "new" workflow case
async function injectToNewWorkflow(json) {
  console.log('injectToNewWorkflow called with:', json);

  // Check API URL and Key - if not available, use fallback
  if (!window.n8nApiUrl || !window.n8nApiKey) {
    console.log('API credentials not available, using fallback');
    addMessage('assistant', 'N8N API credentials not configured. Please save your workflow first or configure API settings.');
    return injectToCanvasFallback(json);
  }

  // Allow HTTP for localhost/127.0.0.1, require HTTPS for other domains
  const isLocalhost = window.n8nApiUrl.includes('localhost') || window.n8nApiUrl.includes('127.0.0.1');
  if (!isLocalhost && !window.n8nApiUrl.startsWith('https://')) {
    console.log('Invalid API URL, using fallback');
    return injectToCanvasFallback(json);
  }
  if (!window.n8nApiUrl.startsWith('http://') && !window.n8nApiUrl.startsWith('https://')) {
    console.log('Invalid API URL format, using fallback');
    return injectToCanvasFallback(json);
  }

  try {
    // Create a new workflow with the provided components
    const newWorkflow = {
      name: `Generated Workflow - ${new Date().toISOString().split('T')[0]}`,
      nodes: json.nodes || [],
      connections: json.connections || {},
      settings: {},
      staticData: null
    };

    console.log('Creating new workflow:', newWorkflow);

    // Create the workflow via POST request
    const createUrl = `${window.n8nApiUrl}/api/v1/workflows`;
    console.log('Proxying POST request to:', createUrl);
    
    const createResponse = await proxyFetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': window.n8nApiKey
      },
      body: JSON.stringify(newWorkflow)
    });

    console.log('Workflow creation response:', createResponse);
    
    if (createResponse && createResponse.id) {
      showMiniToast('New workflow created successfully!');
      addMessage('assistant', `✅ Successfully created a new workflow with your components!

**Workflow Details:**
- **Name:** ${createResponse.name}
- **ID:** ${createResponse.id}
- **Nodes:** ${createResponse.nodes?.length || 0} components added

The workflow has been created and saved in your n8n instance. You can now navigate to it and continue building!`);

      // Optionally redirect to the new workflow (if we can detect the base URL)
      const baseUrl = window.n8nApiUrl.replace('/api/v1', '');
      if (baseUrl !== window.n8nApiUrl) {
        addMessage('assistant', `🔗 **Quick Link:** [Open Workflow](${baseUrl}/workflow/${createResponse.id})`);
      }
    } else {
      throw new Error('Workflow creation succeeded but no ID returned');
    }

  } catch (error) {
    console.error('Error creating new workflow:', error);
    showMiniToast(`Error creating workflow: ${error.message}`);
    addMessage('assistant', `❌ Failed to create new workflow via API: ${error.message}

Falling back to manual import option...`);
    injectToCanvasFallback(json);
  }
}

// Fallback method for canvas injection when API is not available
function injectToCanvasFallback(json) {
  console.log('Using fallback canvas injection method');
  
  // Copy the JSON to clipboard as fallback
  navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    .then(() => {
      showMiniToast('Workflow JSON copied to clipboard');
      addMessage('assistant', `✅ Workflow JSON has been copied to your clipboard!

**To add these components to your workflow:**
1. Save your current workflow first (Ctrl+S)
2. Open the workflow JSON editor (click the "{ }" icon in the toolbar)
3. Paste the copied JSON and merge it with your existing workflow
4. Or create a new workflow and paste the JSON there

The JSON contains the workflow components that were generated for you.`);
    })
    .catch(err => {
      console.error('Could not copy JSON: ', err);
      showMiniToast('Error copying JSON to clipboard');
      addMessage('assistant', `❌ Could not copy to clipboard. Here's the workflow JSON:

\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`

Please copy this manually and paste it into your n8n workflow editor.`);
    });
}

// Create a chat trigger node for various platforms
function createChatTriggerNode(platform = 'slack', position = { x: 100, y: 100 }) {
  const triggerNodes = {
    slack: {
      name: 'Slack Trigger',
      type: 'n8n-nodes-base.slackTrigger',
      typeVersion: 1,
      position: [position.x, position.y],
      parameters: {
        events: ['message']
      },
      credentials: {
        slackApi: {
          id: '',
          name: 'Slack account'
        }
      }
    },
    discord: {
      name: 'Discord Trigger',
      type: 'n8n-nodes-base.discordTrigger',
      typeVersion: 1,
      position: [position.x, position.y],
      parameters: {
        events: ['messageCreate']
      },
      credentials: {
        discordApi: {
          id: '',
          name: 'Discord account'
        }
      }
    },
    mattermost: {
      name: 'Mattermost Trigger',
      type: 'n8n-nodes-base.mattermostTrigger',
      typeVersion: 1,
      position: [position.x, position.y],
      parameters: {
        events: ['message']
      },
      credentials: {
        mattermostApi: {
          id: '',
          name: 'Mattermost account'
        }
      }
    },
    webhook: {
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [position.x, position.y],
      parameters: {
        httpMethod: 'POST',
        path: 'chat-webhook',
        responseMode: 'responseNode'
      }
    }
  };

  return triggerNodes[platform] || triggerNodes.webhook;
}

// Add chat trigger to canvas
async function addChatTrigger(platform = 'slack') {
  console.log(`Adding ${platform} chat trigger to canvas`);
  
  const triggerNode = createChatTriggerNode(platform);
  const workflowJson = {
    nodes: [triggerNode],
    connections: {}
  };

  // Show confirmation message
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (messagesArea) {
    const confirmMsg = `I've created a ${platform} chat trigger. Would you like to add it to your canvas?`;
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'n8n-builder-message assistant-message action';
    actionDiv.innerHTML = `
      <div class="message-avatar assistant-avatar"></div>
      <div class="message-content">
        <p>${confirmMsg}</p>
        <div class="action-buttons">
          <button id="apply-chat-trigger-btn" class="action-button primary">Add to Canvas</button>
          <button id="copy-trigger-json-btn" class="action-button secondary">Copy JSON</button>
        </div>
      </div>
    `;
    messagesArea.appendChild(actionDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // Add event listeners for the buttons
    document.getElementById('apply-chat-trigger-btn').addEventListener('click', () => {
      console.log('Apply chat trigger button clicked!');
      injectToCanvas(workflowJson);
    });

    document.getElementById('copy-trigger-json-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(workflowJson, null, 2))
        .then(() => {
          showMiniToast('Chat trigger JSON copied to clipboard');
        })
        .catch(err => {
          console.error('Could not copy JSON: ', err);
        });
    });
  }
}

// Make functions globally available
window.extractJsonFromResponse = extractJsonFromResponse;
window.processWorkflowJson = processWorkflowJson;
window.injectToCanvas = injectToCanvas;
window.injectToNewWorkflow = injectToNewWorkflow;
window.getWorkflowFromPage = getWorkflowFromPage;
window.mergeWorkflow = mergeWorkflow;
window.injectToCanvasFallback = injectToCanvasFallback;
window.createChatTriggerNode = createChatTriggerNode;
window.addChatTrigger = addChatTrigger;