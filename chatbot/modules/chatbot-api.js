// chatbot/modules/chatbot-api.js

// Use global chat memory and MAX_CONVERSATIONS
// Access via window object to avoid redeclaration issues

// Function to communicate with content script
function sendToContentScript(data) {
  window.dispatchEvent(new CustomEvent('n8nCopilotInjectedEvent', {
    detail: data
  }));
}

// Helper for proxying fetch requests
function proxyFetch(url, options) {
  return new Promise((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random()}`;

    const responseHandler = (event) => {
      if (event.detail.type === 'proxyFetchResponse' && event.detail.requestId === requestId) {
        window.removeEventListener('n8nCopilotContentEvent', responseHandler);
        if (event.detail.success) {
          resolve(event.detail.data);
        } else {
          reject(new Error(event.detail.error || 'Proxy fetch failed'));
        }
      }
    };

    window.addEventListener('n8nCopilotContentEvent', responseHandler);

    sendToContentScript({
      type: 'proxyFetch',
      url,
      options,
      requestId
    });

    setTimeout(() => {
      window.removeEventListener('n8nCopilotContentEvent', responseHandler);
      reject(new Error('Proxy fetch timed out'));
    }, 30000);
  });
}

// New function to handle n8n API commands from the AI
async function handleN8nApiCommand(command) {
  addMessage('assistant', `OK, executing command: ${command.command}`);
  showLoadingIndicator();

  try {
    const url = window.location.href;
    const workflowIdMatch = url.match(/workflow\/([^/?]+)/);
    if (!workflowIdMatch) {
      throw new Error('Could not find workflow ID in the URL.');
    }
    const workflowId = workflowIdMatch[1];

    if (command.command === 'rename_node') {
      const { oldName, newName } = command;
      if (!oldName || !newName) {
        throw new Error('Missing parameters for rename_node command.');
      }

      // 1. Get the current workflow
      const getUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
      const workflow = await proxyFetch(getUrl, {
        method: 'GET',
        headers: { 'X-N8N-API-KEY': n8nApiKey }
      });

      // 2. Find and update the node
      const nodeToUpdate = workflow.nodes.find(node => node.name === oldName);
      if (!nodeToUpdate) {
        throw new Error(`Node with name "${oldName}" not found.`);
      }
      nodeToUpdate.name = newName;

      // 3. Save the updated workflow
      const putUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
      await proxyFetch(putUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        },
        body: JSON.stringify(workflow)
      });
    }
  } catch (error) {
    addMessage('assistant', `Error executing command: ${error.message}`);
    removeLoadingIndicator();
  }
}

// Make functions globally available
window.sendToContentScript = sendToContentScript;
window.proxyFetch = proxyFetch;
window.handleN8nApiCommand = handleN8nApiCommand;