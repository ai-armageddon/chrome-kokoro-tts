// Background script for managing offscreen audio playback
let offscreenDocumentCreated = false;

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'playAudio') {
    createOffscreenDocument().then(() => {
      return sendToOffscreen(request);
    }).then((response) => {
      sendResponse(response);
    }).catch((error) => {
      console.error('Background audio play error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'pauseAudio' || request.action === 'resumeAudio' || 
      request.action === 'stopAudio' || request.action === 'getAudioStatus') {
    if (offscreenDocumentCreated) {
      sendToOffscreen(request).then((response) => {
        sendResponse(response);
      }).catch((error) => {
        console.error('Background audio control error:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      sendResponse({ success: false, error: 'No audio playing' });
    }
    return true;
  }
});

// Listen for messages from offscreen script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'audioEnded') {
    console.log('Background received audio ended notification');
    
    // Notify all content scripts that audio ended
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'audioEnded' }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }
});

// Create offscreen document if it doesn't exist
async function createOffscreenDocument() {
  if (offscreenDocumentCreated) {
    return;
  }
  
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing TTS audio in background'
    });
    offscreenDocumentCreated = true;
    console.log('Offscreen document created');
  } catch (error) {
    if (error.message.includes('already exists')) {
      offscreenDocumentCreated = true;
    } else {
      throw error;
    }
  }
}

// Send message to offscreen document
async function sendToOffscreen(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

console.log('Kokoro TTS background script loaded');
