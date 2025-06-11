// Debug script to analyze conversation grouping
const fs = require('fs');

// Mock the cookie data from our test
const mockChatMemory = [
  { role: 'user', content: 'Question1: How do I create a workflow?' },
  { role: 'assistant', content: 'To create a workflow in n8n, click the "+" button...' },
  { role: 'user', content: 'Question2: How do I connect to a database?' },
  { role: 'assistant', content: 'You can connect to databases using the MySQL, PostgreSQL, or MongoDB nodes...' },
  { role: 'user', content: 'Question3: How do I create a merge node?' },
  { role: 'assistant', content: 'To create a merge node, drag the Merge node from the nodes panel...' },
  { role: 'user', content: 'Question4: How do I set up webhooks?' },
  { role: 'assistant', content: 'To set up webhooks, use the Webhook node...' },
  { role: 'user', content: 'Question5: How do I debug workflows?' },
  { role: 'assistant', content: 'You can debug workflows by using the execution log...' }
];

// Copy the grouping function from chatbot-ui.js
function groupMessagesIntoConversations(messages) {
  if (!messages || messages.length === 0) return [];
  
  const conversations = [];
  let currentConversation = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Start a new conversation if this is a user message and we have a current conversation
    if (message.role === 'user' && currentConversation.length > 0) {
      // Save the current conversation
      conversations.push([...currentConversation]);
      currentConversation = [];
    }
    
    // Add message to current conversation
    currentConversation.push(message);
  }
  
  // Don't forget the last conversation
  if (currentConversation.length > 0) {
    conversations.push(currentConversation);
  }
  
  return conversations;
}

console.log('🔍 Debugging Conversation Grouping\n');

console.log('📊 Mock Chat Memory:');
mockChatMemory.forEach((msg, i) => {
  console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
});

console.log('\n🗂️ Grouped Conversations:');
const conversations = groupMessagesIntoConversations(mockChatMemory);

conversations.forEach((conv, i) => {
  console.log(`\n  Conversation ${i + 1} (${conv.length} messages):`);
  conv.forEach((msg, j) => {
    console.log(`    ${j + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
  });
});

console.log(`\n📈 Summary:`);
console.log(`  Total messages: ${mockChatMemory.length}`);
console.log(`  Total conversations: ${conversations.length}`);
console.log(`  Expected conversations: 5`);

// Test with the CONVERSATIONS_PER_PAGE logic
const CONVERSATIONS_PER_PAGE = 5;
const startIdx = Math.max(0, conversations.length - CONVERSATIONS_PER_PAGE);
const endIdx = conversations.length;
const conversationsToShow = conversations.slice(startIdx, endIdx).reverse();

console.log(`\n🎯 Conversations to Display (last ${CONVERSATIONS_PER_PAGE}, newest first):`);
conversationsToShow.forEach((conv, i) => {
  const firstUserMessage = conv.find(msg => msg.role === 'user');
  const title = firstUserMessage ?
    (firstUserMessage.content.length > 50 ?
      firstUserMessage.content.substring(0, 50) + '...' :
      firstUserMessage.content) :
    'Untitled Conversation';
  
  console.log(`  ${i + 1}. "${title}" (${conv.length} messages)`);
});