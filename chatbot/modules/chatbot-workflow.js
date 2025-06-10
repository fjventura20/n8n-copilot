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

    console.log('Workflow update response:', updateResponse);
    showMiniToast('Workflow updated successfully!');
  } catch (error) {
    console.error('Error injecting to canvas:', error);
    showMiniToast(`Error: ${error.message}`);
    injectToCanvasFallback(json);
  }
}

// Get workflow data from the n8n page context
function getWorkflowFromPage() {
  console.log('Requesting workflow data from content script...');
  sendToContentScript({ type: 'getWorkflowData' });
  // The response will be handled by the workflowDataResponse event listener
}