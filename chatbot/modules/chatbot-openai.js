// chatbot/modules/chatbot-openai.js

// OpenAI API integration with conversation memory support

async function callOpenAI(userMessage) {
  if (!apiKey) {
    addMessage('assistant', 'Please configure your OpenAI API key in the extension settings.');
    return;
  }

  // Show loading indicator
  showLoadingIndicator();

  try {
    // Prepare messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: `You are an expert n8n workflow assistant. You help users create, modify, and understand n8n workflows.

Key capabilities:
- Analyze and explain n8n workflows
- Suggest workflow improvements
- Help with node configurations
- Provide best practices for automation
- Generate workflow JSON when requested
- Add chat triggers (Slack, Discord, Mattermost, Webhook) to workflows

🚨 CRITICAL RULE: When users request to create, add, or generate specific nodes, you MUST ALWAYS provide workflow JSON.

TRIGGER PHRASES that require JSON response:
- "Create a [node type] node"
- "Add a [node type] node"
- "Generate a [node type]"
- "Make a [node type]"
- "I need a [node type]"
- "Set up a [node type]"

MANDATORY JSON FORMAT - Always wrap in \`\`\`json code blocks:

\`\`\`json
{
  "nodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [300, 200],
      "parameters": {
        // node-specific parameters
      }
    }
  ],
  "connections": {}
}
\`\`\`

EXAMPLES:

For "Create an HTTP request node":
\`\`\`json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [300, 200],
      "parameters": {
        "url": "https://api.example.com",
        "method": "GET"
      }
    }
  ],
  "connections": {}
}
\`\`\`

For "Add a merge node":
\`\`\`json
{
  "nodes": [
    {
      "name": "Merge",
      "type": "n8n-nodes-base.merge",
      "typeVersion": 1,
      "position": [400, 300],
      "parameters": {
        "mode": "append"
      }
    }
  ],
  "connections": {}
}
\`\`\`

Common node types:
- HTTP Request: "n8n-nodes-base.httpRequest"
- Merge: "n8n-nodes-base.merge"
- Webhook: "n8n-nodes-base.webhook"
- Set: "n8n-nodes-base.set"
- Code: "n8n-nodes-base.code"
- If: "n8n-nodes-base.if"
- Switch: "n8n-nodes-base.switch"
- Wait: "n8n-nodes-base.wait"

CHAT_TRIGGER command format:
CHAT_TRIGGER: {"platform": "slack|discord|mattermost|webhook"}

REMEMBER: Every node creation request MUST include JSON. No exceptions!`
      }
    ];

    // Add conversation history (last 5 conversations)
    if (window.chatMemory && window.chatMemory.length > 0) {
      // Add the conversation history to maintain context
      messages.push(...window.chatMemory);
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    console.log('Sending to OpenAI with conversation history:', messages);

    // Make API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Remove loading indicator
    removeLoadingIndicator();

    // Add assistant response to chat
    addMessage('assistant', assistantMessage);

    // Check if the response contains workflow JSON
    const workflowJson = extractJsonFromResponse(assistantMessage);
    if (workflowJson) {
      console.log('Extracted workflow JSON:', workflowJson);
      processWorkflowJson(workflowJson);
    }

    // Check if the response contains n8n API commands
    if (assistantMessage.includes('COMMAND:')) {
      const commandMatch = assistantMessage.match(/COMMAND:\s*(\{.*?\})/s);
      if (commandMatch) {
        try {
          const command = JSON.parse(commandMatch[1]);
          await handleN8nApiCommand(command);
        } catch (error) {
          console.error('Error parsing command:', error);
        }
      }
    }

    // Check if the response contains chat trigger commands
    if (assistantMessage.includes('CHAT_TRIGGER:')) {
      const triggerMatch = assistantMessage.match(/CHAT_TRIGGER:\s*(\{.*?\})/s);
      if (triggerMatch) {
        try {
          const triggerCommand = JSON.parse(triggerMatch[1]);
          const platform = triggerCommand.platform || 'slack';
          console.log('Adding chat trigger for platform:', platform);
          await addChatTrigger(platform);
        } catch (error) {
          console.error('Error parsing chat trigger command:', error);
          // Fallback to default platform if parsing fails
          await addChatTrigger('slack');
        }
      }
    }

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    removeLoadingIndicator();
    addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
  }
}

// Helper function to show loading indicator
function showLoadingIndicator() {
  const messagesArea = document.getElementById('n8n-builder-messages');
  if (!messagesArea) return;

  // Remove any existing loading indicator
  removeLoadingIndicator();

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

// Helper function to remove loading indicator
function removeLoadingIndicator() {
  const loadingIndicator = document.getElementById('n8n-builder-loading');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Alias for backward compatibility
function hideLoadingIndicator() {
  removeLoadingIndicator();
}

// Make functions globally available
window.callOpenAI = callOpenAI;
window.showLoadingIndicator = showLoadingIndicator;
window.removeLoadingIndicator = removeLoadingIndicator;
window.hideLoadingIndicator = hideLoadingIndicator;