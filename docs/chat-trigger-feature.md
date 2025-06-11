# Chat Trigger Feature

## Overview

The n8n Co Pilot chatbot now supports adding chat triggers to your n8n workflows. This feature allows users to request the chatbot to add various types of chat platform triggers directly to their canvas.

## Supported Platforms

The chatbot supports the following chat trigger platforms:

1. **Slack Trigger** - For Slack workspace integrations
2. **Discord Trigger** - For Discord server integrations  
3. **Mattermost Trigger** - For Mattermost team integrations
4. **Webhook Trigger** - For generic webhook-based chat integrations

## How to Use

### Basic Usage

Simply ask the chatbot to add a chat trigger:

```
"Add a chat trigger to my workflow"
"I need a Slack trigger for my workflow"
"Can you add a Discord trigger?"
```

### Platform-Specific Requests

You can specify which platform you want:

```
"Add a Slack chat trigger"
"I need a Discord trigger"
"Add a Mattermost trigger to the canvas"
"Create a webhook trigger for chat"
```

## How It Works

1. **User Request**: User asks for a chat trigger in natural language
2. **AI Processing**: The chatbot's AI processes the request and identifies the platform
3. **Trigger Generation**: The system creates the appropriate trigger node configuration
4. **User Confirmation**: The chatbot presents options to add to canvas or copy JSON
5. **Canvas Integration**: If approved, the trigger is added to the current workflow

## Technical Implementation

### Chat Trigger Node Structure

Each chat trigger node includes:

- **Name**: Platform-specific name (e.g., "Slack Trigger")
- **Type**: n8n node type identifier
- **Position**: Canvas coordinates
- **Parameters**: Platform-specific configuration
- **Credentials**: Authentication setup for the platform

### Example Slack Trigger Node

```json
{
  "name": "Slack Trigger",
  "type": "n8n-nodes-base.slackTrigger",
  "typeVersion": 1,
  "position": [100, 100],
  "parameters": {
    "events": ["message"]
  },
  "credentials": {
    "slackApi": {
      "id": "",
      "name": "Slack account"
    }
  }
}
```

## Configuration Requirements

After adding a chat trigger, you'll need to:

1. **Set up credentials** for the chosen platform
2. **Configure event types** you want to listen for
3. **Connect the trigger** to other workflow nodes
4. **Test the integration** with your chat platform

## API Integration

The feature integrates with the n8n API to:

- Fetch current workflow data
- Merge new trigger nodes with existing workflows
- Update workflows on the canvas
- Handle fallback scenarios when API is unavailable

## Error Handling

The system includes robust error handling:

- **API Unavailable**: Falls back to copying JSON to clipboard
- **Invalid Platform**: Defaults to webhook trigger
- **Merge Conflicts**: Ensures unique node names
- **Network Issues**: Provides clear error messages

## Future Enhancements

Planned improvements include:

- Support for additional chat platforms
- Pre-configured event templates
- Automatic credential setup guidance
- Integration with workflow templates