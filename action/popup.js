document.addEventListener('DOMContentLoaded', () => {
  const showChatButton = document.getElementById('showChat');
  const settingsButton = document.getElementById('settingsButton');
  const settingsFrame = document.getElementById('settingsFrame');

  // Hide settings frame by default
  if (settingsFrame) {
    settingsFrame.style.display = 'none';
  }

  if (showChatButton) {
    showChatButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleChat' });
          window.close(); // Close the popup
        }
      });
    });
  }

  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      if (settingsFrame) {
        // Toggle settings frame visibility
        const isVisible = settingsFrame.style.display === 'block';
        settingsFrame.style.display = isVisible ? 'none' : 'block';
      }
    });
  }
});
