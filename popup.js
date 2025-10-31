document.getElementById('speak').addEventListener('click', () => generateSpeech());
document.getElementById('getSelected').addEventListener('click', getSelectedText);
document.getElementById('pause').addEventListener('click', pauseAudio);
document.getElementById('resume').addEventListener('click', resumeAudio);
document.getElementById('stop').addEventListener('click', stopAudio);
document.getElementById('resetSpeed').addEventListener('click', resetSpeed);

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
  
  // Speed slider event listener - now real-time
  const speedSlider = document.getElementById('speed');
  const speedValue = document.getElementById('speedValue');
  const resetSpeedBtn = document.getElementById('resetSpeed');
  
  speedSlider.addEventListener('input', (e) => {
    const newSpeed = parseFloat(e.target.value);
    speedValue.textContent = newSpeed + 'x';
    updateResetSpeedButton(newSpeed);
    
    // Apply speed change immediately to current audio
    chrome.runtime.sendMessage({ action: 'setSpeed', speed: newSpeed }, (response) => {
      if (response && response.success) {
        console.log('Speed updated to:', newSpeed);
      }
    });
  });
  
  // Get current speed when popup opens
  chrome.runtime.sendMessage({ action: 'getSpeed' }, (response) => {
    if (response && response.speed !== undefined) {
      speedSlider.value = response.speed;
      speedValue.textContent = response.speed + 'x';
      updateResetSpeedButton(response.speed);
    }
  });
});

async function checkAudioStatus() {
  chrome.runtime.sendMessage({ action: 'getAudioStatus' }, (response) => {
    if (response) {
      if (response.isPlaying) {
        showStatus('Audio is playing...', 'success');
        updateResumeButton(false); // Disable resume when playing
      } else if (response.isPaused) {
        showStatus('Audio is paused', 'success');
        updateResumeButton(true); // Enable resume when paused
      } else {
        updateResumeButton(false); // Disable resume if no audio
      }
    } else {
      updateResumeButton(false); // Disable resume if no response
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
    // Check if text needs chunking (more than 500 characters)
    if (text.length > 500) {
      return await generateChunkedSpeech(text, voice);
    }
    
    console.log('Sending TTS request:', { text, voice });
    
    const response = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: voice,
        speed: 1.0, // Always generate at 1x speed
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
      updateResumeButton(true); // Enable resume when paused
    } else {
      showStatus('Error pausing audio', 'error');
    }
  });
}

function resumeAudio() {
  chrome.runtime.sendMessage({ action: 'resumeAudio' }, (response) => {
    if (response && response.success) {
      showStatus('Audio resumed', 'success');
      updateResumeButton(false); // Disable resume when playing
    } else {
      showStatus('Error resuming audio', 'error');
    }
  });
}

function stopAudio() {
  chrome.runtime.sendMessage({ action: 'stopAudio' }, (response) => {
    if (response && response.success) {
      showStatus('Audio stopped', 'success');
      updateResumeButton(false); // Disable resume when stopped
    } else {
      showStatus('Error stopping audio', 'error');
    }
  });
}

// Reset speed to 1x
function resetSpeed() {
  const speedSlider = document.getElementById('speed');
  const speedValue = document.getElementById('speedValue');
  
  speedSlider.value = 1.0;
  speedValue.textContent = '1.0x';
  updateResetSpeedButton(1.0);
  
  // Apply speed change immediately
  chrome.runtime.sendMessage({ action: 'setSpeed', speed: 1.0 }, (response) => {
    if (response && response.success) {
      console.log('Speed reset to 1.0x');
      showStatus('Speed reset to 1x', 'success');
    }
  });
}

// Update reset speed button state
function updateResetSpeedButton(currentSpeed) {
  const resetBtn = document.getElementById('resetSpeed');
  if (Math.abs(currentSpeed - 1.0) < 0.01) {
    resetBtn.disabled = true;
    resetBtn.textContent = '1x';
  } else {
    resetBtn.disabled = false;
    resetBtn.textContent = '1x';
  }
}

// Update resume button state
function updateResumeButton(canResume) {
  const resumeBtn = document.getElementById('resume');
  if (canResume) {
    resumeBtn.disabled = false;
    resumeBtn.classList.remove('disabled');
  } else {
    resumeBtn.disabled = true;
    resumeBtn.classList.add('disabled');
  }
}

// Chunked speech generation for long texts
async function generateChunkedSpeech(text, voice) {
  const chunks = splitTextIntoChunks(text, 400); // 400 chars per chunk for safety
  console.log(`Split text into ${chunks.length} chunks`);
  
  showStatus(`Generating chunk 1/${chunks.length}...`, 'loading');
  
  try {
    // Generate first chunk immediately and start playing
    const firstChunkResponse = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: chunks[0],
        voice: voice,
        speed: 1.0, // Always generate at 1x speed
        lang_code: voice[0],
        return_phonemes: false
      })
    });
    
    if (!firstChunkResponse.ok) {
      throw new Error('Failed to generate first chunk');
    }
    
    const firstResult = await firstChunkResponse.json();
    if (!firstResult.success || !firstResult.audio_url) {
      throw new Error('Failed to generate first chunk');
    }
    
    // Start playing first chunk
    const firstAudioUrl = `http://localhost:8000${firstResult.audio_url}`;
    chrome.runtime.sendMessage({
      action: 'playAudio',
      audioUrl: firstAudioUrl
    }, (response) => {
      if (response && response.success) {
        showStatus('Playing chunk 1/' + chunks.length + '...', 'success');
        
        // Send initial chunk update to content scripts
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'chunkUpdate',
              currentChunk: 1,
              totalChunks: chunks.length
            }).catch(() => {
              // Ignore errors for tabs that don't have content script
            });
          });
        });
      }
    });
    
    // Pre-generate remaining chunks in background
    generateRemainingChunks(chunks.slice(1), voice);
    
    return Promise.resolve();
    
  } catch (error) {
    console.error('Chunked TTS Error:', error);
    showStatus('Error: ' + error.message, 'error');
    return Promise.reject(error);
  }
}

// Split text into smart chunks (preferably at sentence boundaries)
function splitTextIntoChunks(text, maxChunkSize) {
  const chunks = [];
  let currentChunk = '';
  
  // Split by sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // If single sentence is too long, split it further
      if (sentence.length > maxChunkSize) {
        const words = sentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          if (wordChunk.length + word.length + 1 <= maxChunkSize) {
            wordChunk += (wordChunk ? ' ' : '') + word;
          } else {
            if (wordChunk.trim()) {
              chunks.push(wordChunk.trim());
            }
            wordChunk = word;
          }
        }
        
        if (wordChunk.trim()) {
          currentChunk = wordChunk;
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Generate remaining chunks and queue them for playback
async function generateRemainingChunks(chunks, voice) {
  for (let i = 0; i < chunks.length; i++) {
    try {
      // Wait a bit before generating next chunk to not overwhelm the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      showStatus(`Generating chunk ${i + 2}/${chunks.length + 1}...`, 'loading');
      
      const response = await fetch('http://localhost:8000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chunks[i],
          voice: voice,
          speed: 1.0, // Always generate at 1x speed
          lang_code: voice[0],
          return_phonemes: false
        })
      });
      
      if (!response.ok) {
        console.error(`Failed to generate chunk ${i + 2}`);
        continue;
      }
      
      const result = await response.json();
      if (result.success && result.audio_url) {
        const audioUrl = `http://localhost:8000${result.audio_url}`;
        
        // Send chunk update to content scripts
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'chunkUpdate',
              currentChunk: i + 2,
              totalChunks: chunks.length + 1
            }).catch(() => {
              // Ignore errors for tabs that don't have content script
            });
          });
        });
        
        // Queue this chunk for playback
        chrome.runtime.sendMessage({
          action: 'queueAudio',
          audioUrl: audioUrl
        });
        
        showStatus(`Playing chunk ${i + 2}/${chunks.length + 1}...`, 'success');
      }
      
    } catch (error) {
      console.error(`Error generating chunk ${i + 2}:`, error);
    }
  }
}
