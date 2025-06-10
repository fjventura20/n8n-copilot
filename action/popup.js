document.addEventListener('DOMContentLoaded', () => {
  const showChatButton = document.getElementById('showChat');
  const settingsButton = document.getElementById('settingsButton');
 
   if (showChatButton) {
     showChatButton.addEventListener('click', () => {
       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
         if (tabs.length > 0) {
           chrome.tabs.sendMessage(tabs[0].id, { action: 'showChat' });
         }
       });
     });
   }
 
   if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
   }
});