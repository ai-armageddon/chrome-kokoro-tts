// Background script for managing offscreen audio playback
let currentSpeed = 1.0; // Store speed in background script

// Load saved speed from storage on startup
chrome.storage.local.get(['kokoro-tts-speed'], (result) => {
  if (result['kokoro-tts-speed'] !== undefined) {
    currentSpeed = parseFloat(result['kokoro-tts-speed']);
    console.log('Background: Loaded saved speed from storage:', currentSpeed);
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Proxy TTS generation for content scripts: requests to localhost must come
  // from the extension (which has host_permissions), not the web page, or
  // Chrome shows a local-network-access permission prompt on every site
  if (request.action === 'generateTTS') {
    fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: request.text,
        voice: request.voice,
        speed: 1.0, // Always generate at 1x speed; playback rate is applied in offscreen
        lang_code: request.voice[0],
        return_phonemes: false
      })
    }).then((response) => {
      if (!response.ok) {
        throw new Error('API error: ' + response.status);
      }
      return response.json();
    }).then((result) => {
      sendResponse({ success: true, result: result });
    }).catch((error) => {
      console.error('Background TTS fetch error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

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

  if (request.action === 'queueAudio') {
    hasOffscreenDocument().then((exists) => {
      if (!exists) {
        throw new Error('No audio playing - queue not available');
      }
      return sendToOffscreen(request);
    }).then((response) => {
      sendResponse(response);
    }).catch((error) => {
      console.error('Background audio queue error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'pauseAudio' || request.action === 'resumeAudio' ||
      request.action === 'stopAudio' || request.action === 'getAudioStatus') {
    hasOffscreenDocument().then((exists) => {
      if (!exists) {
        throw new Error('No audio playing');
      }
      return sendToOffscreen(request);
    }).then((response) => {
      sendResponse(response);
    }).catch((error) => {
      console.error('Background audio control error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'setSpeed') {
    currentSpeed = request.speed;
    // Save to storage so it persists
    chrome.storage.local.set({ 'kokoro-tts-speed': request.speed });
    console.log('Background: Stored speed:', currentSpeed);

    hasOffscreenDocument().then((exists) => {
      if (!exists) {
        return { success: true };
      }
      return sendToOffscreen(request);
    }).then((response) => {
      sendResponse(response);
    }).catch((error) => {
      console.error('Background speed control error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'getSpeed') {
    // Always read from storage to ensure we have the latest value
    chrome.storage.local.get(['kokoro-tts-speed'], (result) => {
      const speed = result['kokoro-tts-speed'] !== undefined 
        ? parseFloat(result['kokoro-tts-speed']) 
        : currentSpeed;
      currentSpeed = speed; // Update local cache
      console.log('Background: getSpeed returning:', speed);
      sendResponse({ speed: speed });
    });
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
  
  if (request.action === 'audioStarted') {
    console.log('Background received audio started notification');
    
    // Notify all content scripts that audio started
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'audioStarted',
          chunkText: request.chunkText,
          chunkIndex: request.chunkIndex
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }
  
  if (request.action === 'audioPaused') {
    console.log('Background received audio paused notification');
    
    // Notify all content scripts that audio paused
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'audioPaused' }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }
  
  if (request.action === 'audioResumed') {
    console.log('Background received audio resumed notification');
    
    // Notify all content scripts that audio resumed
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'audioResumed' }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }
});

// Check for a live offscreen document; an in-memory flag would go stale
// whenever the service worker is restarted mid-playback
async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  return contexts.length > 0;
}

// Create offscreen document if it doesn't exist
async function createOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing TTS audio in background'
    });
    console.log('Offscreen document created');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }
}

// Send message to offscreen document. The target tag is required: runtime
// messages are broadcast to every extension context, and without it the
// offscreen document also acts on the original popup/content-script message,
// playing or queueing the same audio twice.
async function sendToOffscreen(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ ...message, target: 'offscreen' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('sendToOffscreen:', chrome.runtime.lastError.message);
      }
      resolve(response);
    });
  });
}

console.log('Aura Reader background script loaded');
