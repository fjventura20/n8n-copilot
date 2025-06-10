// chatbot/modules/chatbot-api.js

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
        body: JSON.stringify(cleanWorkflowForPut(workflow))
      });

      addMessage('assistant', `Successfully renamed node from "${oldName}" to "${newName}". Reloading to apply changes.`);
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Add a small delay before reloading
    } else {
      throw new Error(`Unknown command: ${command.command}`);
    }
  } catch (error) {
    console.error('Error handling n8n API command:', error);
    addMessage('assistant', `Error: ${error.message}`);
  } finally {
    removeLoadingIndicator();
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