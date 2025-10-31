document.getElementById('speak').addEventListener('click', () => generateSpeech());
document.getElementById('getSelected').addEventListener('click', getSelectedText);
document.getElementById('pause').addEventListener('click', pauseAudio);
document.getElementById('resume').addEventListener('click', resumeAudio);
document.getElementById('stop').addEventListener('click', stopAudio);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup received message:', request);
  
  if (request.action === 'playText') {
    // Insert the selected text into textarea
    document.getElementById('text').value = request.text;
    
    // Automatically generate speech
    generateSpeech(request.voice).then(() => {
      console.log('Speech generation complete');
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Test API connection on popup open
document.addEventListener('DOMContentLoaded', () => {
  checkAPIConnection();
  checkAudioStatus();
});

async function checkAudioStatus() {
  chrome.runtime.sendMessage({ action: 'getAudioStatus' }, (response) => {
    if (response && response.isPlaying) {
      showStatus('Audio is playing...', 'success');
    }
  });
}

async function checkAPIConnection() {
  try {
    const response = await fetch('http://localhost:8000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const health = await response.json();
      console.log('API Health:', health);
    } else {
      showStatus('API server not responding', 'error');
    }
  } catch (error) {
    console.error('API connection failed:', error);
    showStatus('Cannot connect to API server', 'error');
  }
}

async function getSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString().trim()
    });
    
    const selectedText = results[0]?.result;
    if (selectedText) {
      document.getElementById('text').value = selectedText;
      showStatus('Text loaded', 'success');
    } else {
      showStatus('No text selected', 'error');
    }
  } catch (error) {
    showStatus('Error getting text', 'error');
  }
}

async function generateSpeech(voiceOverride) {
  const text = document.getElementById('text').value.trim();
  const voice = voiceOverride || document.getElementById('voice').value;
  
  if (!text) {
    showStatus('Please enter text', 'error');
    return Promise.reject(new Error('No text'));
  }
  
  showStatus('Generating...', 'loading');
  
  try {
    console.log('Sending TTS request:', { text, voice, speed: 1.0 });
    
    const response = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: voice,
        speed: 1.0,
        lang_code: voice[0], // Extract language code from voice (a=american, b=british)
        return_phonemes: false
      })
    });
    
    console.log('TTS response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', errorData);
      throw new Error('API error: ' + response.status);
    }
    
    const result = await response.json();
    console.log('TTS result:', result);
    
    if (result.success && result.audio_url) {
      const audioUrl = `http://localhost:8000${result.audio_url}`;
      console.log('Sending audio to background for playback:', audioUrl);
      
      // Send audio URL to background script for persistent playback
      chrome.runtime.sendMessage({
        action: 'playAudio',
        audioUrl: audioUrl
      }, (response) => {
        if (response && response.success) {
          showStatus('Playing audio...', 'success');
        } else {
          console.error('Background audio error:', response?.error);
          showStatus('Error playing audio', 'error');
        }
      });
      
      return Promise.resolve();
    } else {
      throw new Error('Failed to generate speech');
    }
    
  } catch (error) {
    console.error('TTS Error:', error);
    showStatus('Error: ' + error.message, 'error');
    return Promise.reject(error);
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  status.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(() => {
      status.classList.add('hidden');
    }, 3000);
  }
}

// Audio control functions
function pauseAudio() {
  chrome.runtime.sendMessage({ action: 'pauseAudio' }, (response) => {
    if (response && response.success) {
      showStatus('Audio paused', 'success');
    } else {
      showStatus('Error pausing audio', 'error');
    }
  });
}

function resumeAudio() {
  chrome.runtime.sendMessage({ action: 'resumeAudio' }, (response) => {
    if (response && response.success) {
      showStatus('Audio resumed', 'success');
    } else {
      showStatus('Error resuming audio', 'error');
    }
  });
}

function stopAudio() {
  chrome.runtime.sendMessage({ action: 'stopAudio' }, (response) => {
    if (response && response.success) {
      showStatus('Audio stopped', 'success');
    } else {
      showStatus('Error stopping audio', 'error');
    }
  });
}
