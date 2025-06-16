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
  addMessage('assistant', `OK, executing command: ${command.command || JSON.stringify(command)}`);
  showLoadingIndicator();

  try {
    const url = window.location.href;
    const workflowIdMatch = url.match(/workflow\/([^/?]+)/);
    if (!workflowIdMatch) {
      throw new Error('Could not find workflow ID in the URL.');
    }
    const workflowId = workflowIdMatch[1];

    // 1. Get the current workflow
    const getUrl = `${n8nApiUrl}/api/v1/workflows/${workflowId}`;
    const workflow = await proxyFetch(getUrl, {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': n8nApiKey }
    });

    // Handle different command types
    if (command.command === 'rename_node') {
      await handleRenameNode(workflow, workflowId, command);
    } else if (command.command === 'add_node') {
      await handleAddNode(workflow, workflowId, command);
    } else if (command.command === 'delete_node') {
      await handleDeleteNode(workflow, workflowId, command);
    } else if (command.command === 'connect_nodes') {
      await handleConnectNodes(workflow, workflowId, command);
    } else if (command.command === 'update_node') {
      await handleUpdateNode(workflow, workflowId, command);
    } else if (command.command === 'count_nodes') {
      await handleCountNodes(workflow, workflowId, command);
    } else {
      throw new Error(`Unknown command: ${command.command}`);
    }

    addMessage('assistant', `Successfully executed command: ${command.command}`);
  } catch (error) {
    addMessage('assistant', `Error executing command: ${error.message}`);
  } finally {
    removeLoadingIndicator();
  }
}

/**
 * Handle rename_node command
 */
async function handleRenameNode(workflow, workflowId, command) {
  const { oldName, newName } = command;
  if (!oldName || !newName) {
    throw new Error('Missing parameters for rename_node command.');
  }

  // Find and update the node
  const nodeToUpdate = workflow.nodes.find(node => node.name === oldName);
  if (!nodeToUpdate) {
    throw new Error(`Node with name "${oldName}" not found.`);
  }
  nodeToUpdate.name = newName;

  // Save the updated workflow
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

/**
 * Handle add_node command
 */
async function handleAddNode(workflow, workflowId, command) {
  const { node } = command;
  if (!node || !node.name || !node.type) {
    throw new Error('Missing parameters for add_node command. Node must have name and type.');
  }

  // Add default position if not provided
  if (!node.position) {
    node.position = [Math.random() * 500, Math.random() * 500];
  }

  // Add the new node to the workflow
  workflow.nodes.push(node);

  // Save the updated workflow
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

/**
 * Handle delete_node command
 */
async function handleDeleteNode(workflow, workflowId, command) {
  const { nodeName } = command;
  if (!nodeName) {
    throw new Error('Missing nodeName parameter for delete_node command.');
  }

  // Find and remove the node
  const nodeIndex = workflow.nodes.findIndex(node => node.name === nodeName);
  if (nodeIndex === -1) {
    throw new Error(`Node with name "${nodeName}" not found.`);
  }

  // Remove the node
  workflow.nodes.splice(nodeIndex, 1);

  // Also remove any connections to/from this node
  const connectionsToRemove = [];
  for (const [outputNodeId, outputs] of Object.entries(workflow.connections || {})) {
    for (const [inputNodeId, inputIndex] of Object.entries(outputs)) {
      if (inputNodeId === nodeName || outputNodeId === nodeName) {
        connectionsToRemove.push({ outputNodeId, inputNodeId });
      }
    }
  }

  // Remove the connections
  for (const { outputNodeId, inputNodeId } of connectionsToRemove) {
    if (workflow.connections[outputNodeId] && workflow.connections[outputNodeId][inputNodeId] !== undefined) {
      delete workflow.connections[outputNodeId][inputNodeId];
    }
  }

  // Save the updated workflow
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

/**
 * Handle connect_nodes command
 */
async function handleConnectNodes(workflow, workflowId, command) {
  const { outputNode, inputNode, outputPort = 0, inputPort = 0 } = command;
  if (!outputNode || !inputNode) {
    throw new Error('Missing parameters for connect_nodes command. Both outputNode and inputNode are required.');
  }

  // Ensure connections object exists
  if (!workflow.connections) {
    workflow.connections = {};
  }

  // Create connections if they don't exist
  if (!workflow.connections[outputNode]) {
    workflow.connections[outputNode] = {};
  }

  // Add the connection
  workflow.connections[outputNode][inputNode] = {
    port: outputPort,
    portType: 'main',
    index: inputPort
  };

  // Save the updated workflow
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

/**
 * Handle update_node command
 */
async function handleUpdateNode(workflow, workflowId, command) {
  const { nodeName, updates } = command;
  if (!nodeName || !updates) {
    throw new Error('Missing parameters for update_node command. Both nodeName and updates are required.');
  }

  // Find the node to update
  const nodeToUpdate = workflow.nodes.find(node => node.name === nodeName);
  if (!nodeToUpdate) {
    throw new Error(`Node with name "${nodeName}" not found.`);
  }

  // Apply updates
  Object.assign(nodeToUpdate, updates);

  // Save the updated workflow
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

/**
 * Handle count_nodes command
 */
async function handleCountNodes(workflow, workflowId, command) {
  // Simply return the number of nodes in the workflow
  const nodeCount = workflow.nodes.length;
  addMessage('assistant', `The workflow has ${nodeCount} nodes.`);
}

// Make functions globally available
window.sendToContentScript = sendToContentScript;
window.proxyFetch = proxyFetch;
window.handleN8nApiCommand = handleN8nApiCommand;