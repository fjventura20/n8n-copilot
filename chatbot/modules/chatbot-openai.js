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
- Execute natural language commands to manipulate the N8N canvas

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

NATURAL LANGUAGE COMMANDS:
You can execute natural language commands to manipulate the N8N canvas using the following formats:

1. Rename a node:
   "Rename 'Old Node Name' to 'New Node Name'"

2. Add a new node:
   "Add a new node named 'Node Name' of type 'nodeType' with parameters {JSON parameters}"

3. Delete a node:
   "Delete the node named 'Node Name'"

4. Connect nodes:
   "Connect 'Output Node Name' to 'Input Node Name'"

5. Update a node:
   "Update 'Node Name' with new parameters {JSON parameters}"

6. Count nodes:
   "Count the nodes in the workflow"

These commands will be automatically translated into API calls to manipulate the canvas.

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

    // Check for natural language commands to manipulate the N8N canvas
    const naturalLanguageCommands = [
      { pattern: /rename '(.+?)' to '(.+?)'/i, handler: (matches) => ({
        command: 'rename_node',
        oldName: matches[1],
        newName: matches[2]
      }) },
      { pattern: /add a new node named '(.+?)' of type '(.+?)'(?: with parameters (.+))?/i, handler: (matches) => {
        const nodeName = matches[1];
        const nodeType = matches[2];
        let parameters = {};
        try {
          parameters = matches[3] ? JSON.parse(matches[3]) : {};
        } catch (error) {
          console.error('Error parsing parameters:', error);
          addMessage('assistant', 'Error parsing parameters. Please provide valid JSON.');
          return null;
        }
        return {
          command: 'add_node',
          node: {
            name: nodeName,
            type: nodeType,
            position: [Math.random() * 500, Math.random() * 500],
            parameters: parameters
          }
        };
      } },
      { pattern: /delete the node named '(.+?)'/i, handler: (matches) => ({
        command: 'delete_node',
        nodeName: matches[1]
      }) },
      { pattern: /connect '(.+?)' to '(.+?)'/i, handler: (matches) => ({
        command: 'connect_nodes',
        outputNode: matches[1],
        inputNode: matches[2]
      }) },
      { pattern: /update '(.+?)' with new parameters (.+)/i, handler: (matches) => {
        const nodeName = matches[1];
        let updates = {};
        try {
          updates = JSON.parse(matches[2]);
        } catch (error) {
          console.error('Error parsing updates:', error);
          addMessage('assistant', 'Error parsing updates. Please provide valid JSON.');
          return null;
        }
        return {
          command: 'update_node',
          nodeName: nodeName,
          updates: updates
        };
      } },
      { pattern: /count the nodes in the workflow/i, handler: () => ({
        command: 'count_nodes'
      }) }
    ];

    for (const cmd of naturalLanguageCommands) {
      const match = userMessage.match(cmd.pattern);
      if (match) {
        const apiCommand = cmd.handler(match);
        if (apiCommand) {
          await handleN8nApiCommand(apiCommand);
          return;
        }
      }
    }

  } catch (error) {
    removeLoadingIndicator();
    addMessage('assistant', `Error: ${error.message}`);
  }
}