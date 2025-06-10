// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('n8n Co Pilot Extension installed');
  });
  
  // Message handling between popup/settings and content script/chatbot
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background:', request);
  
    // Handle proxy requests from content scripts
    if (request.action === 'proxyFetch') {
      console.log('Proxying fetch request to:', request.url);
      console.log('Proxy fetch options:', request.options);
      fetch(request.url, request.options)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${text}`);
            });
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return response.json();
          }
          return response.text();
        })
        .then(data => {
          console.log('Proxy fetch successful for requestId:', request.requestId);
          sendResponse({ success: true, data, requestId: request.requestId });
        })
        .catch(error => {
          console.error('Proxy fetch failed for requestId:', request.requestId, error);
          sendResponse({ success: false, error: error.toString(), requestId: request.requestId });
        });
      return true; // Indicates that the response is sent asynchronously
    }
  
    // Pass through any settings updates from popup to content script
    if (request.action === 'settingsUpdated') {
      console.log('Settings updated, passing to tabs');
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, request).catch(err => {
            // Ignore errors for tabs that don't have listeners
            console.log(`Could not send to tab ${tab.id}`, err);
          });
        });
      });
      sendResponse({ status: 'received' });
      return true;
    }
  
    // Handle showChat request from settings
    if (request.action === 'showChat') {
      console.log('Show chat request received in background');
      // We'll pass this to the content script of the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, request);
        }
      });
      sendResponse({ status: 'received' });
      return true;
    }
  
    // Default response for unhandled actions
    sendResponse({ status: 'received' });
    return true;
  });