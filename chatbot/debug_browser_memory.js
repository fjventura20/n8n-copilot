// Browser debug script to check actual chat memory
// This should be run in the browser console on an n8n page

console.log('🔍 Debugging Browser Chat Memory\n');

// Check if getCookie function exists
if (typeof getCookie === 'function') {
  console.log('✅ getCookie function available');
  
  const cookieKey = 'n8n-copilot-chat-memory';
  const stored = getCookie(cookieKey);
  
  if (stored) {
    console.log('✅ Cookie found');
    console.log('📊 Raw cookie data length:', stored.length);
    console.log('📊 Raw cookie data preview:', stored.substring(0, 200) + '...');
    
    try {
      const parsedHistory = JSON.parse(stored);
      console.log('✅ Cookie parsed successfully');
      console.log('📊 Total messages in memory:', parsedHistory.length);
      
      console.log('\n📝 Messages in memory:');
      parsedHistory.forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
      });
      
      // Group into conversations using the same logic
      const conversations = [];
      let currentConversation = [];
      
      for (let i = 0; i < parsedHistory.length; i++) {
        const message = parsedHistory[i];
        
        if (message.role === 'user' && currentConversation.length > 0) {
          conversations.push([...currentConversation]);
          currentConversation = [];
        }
        
        currentConversation.push(message);
      }
      
      if (currentConversation.length > 0) {
        conversations.push(currentConversation);
      }
      
      console.log('\n🗂️ Grouped conversations:');
      conversations.forEach((conv, i) => {
        const firstUserMessage = conv.find(msg => msg.role === 'user');
        const title = firstUserMessage ? firstUserMessage.content.substring(0, 50) : 'Untitled';
        console.log(`  ${i + 1}. "${title}..." (${conv.length} messages)`);
      });
      
      // Check for Question3 specifically
      const question3Messages = parsedHistory.filter(msg => 
        msg.content.toLowerCase().includes('question3') || 
        msg.content.toLowerCase().includes('merge node')
      );
      
      console.log('\n🎯 Question3/Merge node related messages:');
      if (question3Messages.length > 0) {
        question3Messages.forEach((msg, i) => {
          console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`);
        });
      } else {
        console.log('  ❌ No Question3 or merge node messages found');
      }
      
    } catch (error) {
      console.error('❌ Failed to parse cookie data:', error);
      console.log('📊 Attempting to show raw data structure...');
      console.log(stored);
    }
  } else {
    console.log('❌ No chat memory cookie found');
  }
} else {
  console.error('❌ getCookie function not available');
  console.log('Available functions:', Object.keys(window).filter(key => typeof window[key] === 'function').slice(0, 10));
}

// Also check window.chatMemory if it exists
if (window.chatMemory) {
  console.log('\n🧠 window.chatMemory found:');
  console.log('📊 Length:', window.chatMemory.length);
  window.chatMemory.forEach((msg, i) => {
    console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
  });
} else {
  console.log('\n❌ window.chatMemory not found');
}