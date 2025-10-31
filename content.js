// Content script for play icon next to selected text

let playButton = null;
let pauseButton = null;
let stopButton = null;
let chunkIndicator = null;
let audioControls = null;
let isPlaying = false;
let currentChunk = 0;
let totalChunks = 0;

// Create play button element
function createPlayButton() {
  const button = document.createElement('div');
  button.innerHTML = '▶';
  button.style.cssText = `
    position: absolute;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,123,255,0.4);
    transition: all 0.2s;
    user-select: none;
    font-weight: bold;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.15)';
    button.style.background = '#0056b3';
    button.style.boxShadow = '0 6px 16px rgba(0,123,255,0.5)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.background = '#007bff';
    button.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Play button clicked!');
    speakSelectedText();
  });
  
  return button;
}

// Create audio controls container
function createAudioControls() {
  const controls = document.createElement('div');
  controls.style.cssText = `
    position: absolute;
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 20px;
    padding: 4px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s;
    backdrop-filter: blur(10px);
  `;
  
  return controls;
}

// Create pause button for top-right corner
function createPauseButton() {
  const button = document.createElement('div');
  button.innerHTML = '❚❚';
  button.style.cssText = `
    position: fixed;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(220,53,69,0.4);
    transition: all 0.2s;
    user-select: none;
    font-weight: bold;
    top: 20px;
    right: 20px;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.15)';
    button.style.background = '#c82333';
    button.style.boxShadow = '0 6px 16px rgba(220,53,69,0.5)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.background = '#dc3545';
    button.style.boxShadow = '0 4px 12px rgba(220,53,69,0.4)';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Pause button clicked!');
    pauseAudio();
  });
  
  return button;
}

// Create play button for mini controls
function createMiniPlayButton() {
  const button = document.createElement('div');
  button.innerHTML = '▶';
  button.style.cssText = `
    background: #28a745;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 10px;
    font-weight: bold;
    transition: all 0.2s;
    user-select: none;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.background = '#218838';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.background = '#28a745';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Mini play button clicked!');
    resumeAudio();
  });
  
  return button;
}

// Create stop button for mini controls
function createStopButton() {
  const button = document.createElement('div');
  button.innerHTML = '■';
  button.style.cssText = `
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 10px;
    font-weight: bold;
    transition: all 0.2s;
    user-select: none;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.background = '#c82333';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.background = '#dc3545';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Mini stop button clicked!');
    stopAudio();
  });
  
  return button;
}
function createChunkIndicator() {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: absolute;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(40,167,69,0.4);
    transition: all 0.2s;
    user-select: none;
    pointer-events: none;
    min-width: 24px;
    text-align: center;
  `;
  
  return indicator;
}

// Update chunk indicator display
function updateChunkIndicator(chunk, total) {
  if (chunkIndicator && total > 1) {
    chunkIndicator.textContent = `${chunk}/${total}`;
    chunkIndicator.style.display = 'block';
  } else if (chunkIndicator) {
    chunkIndicator.style.display = 'none';
  }
}

// Show audio controls (pause/play/stop)
function showAudioControls(isPaused = false) {
  if (!audioControls) {
    audioControls = createAudioControls();
    document.body.appendChild(audioControls);
  }
  
  // Clear existing controls
  audioControls.innerHTML = '';
  
  if (isPaused) {
    // Show play button when paused
    const miniPlayBtn = createMiniPlayButton();
    audioControls.appendChild(miniPlayBtn);
  } else {
    // Show pause button when playing
    const miniPauseBtn = createMiniPauseButton();
    audioControls.appendChild(miniPauseBtn);
  }
  
  // Always show stop button
  const miniStopBtn = createStopButton();
  audioControls.appendChild(miniStopBtn);
  
  // Position controls where play button was
  if (playButton) {
    const rect = playButton.getBoundingClientRect();
    audioControls.style.display = 'flex';
    audioControls.style.left = (rect.left + window.scrollX) + 'px';
    audioControls.style.top = (rect.top + window.scrollY) + 'px';
  }
}

// Hide audio controls
function hideAudioControls() {
  if (audioControls) {
    audioControls.style.display = 'none';
  }
}

// Hide chunk indicator
function hideChunkIndicator() {
  if (chunkIndicator) {
    chunkIndicator.style.display = 'none';
  }
}
// Create pause button for mini controls
function createMiniPauseButton() {
  const button = document.createElement('div');
  button.innerHTML = '❚❚';
  button.style.cssText = `
    background: #ffc107;
    color: #212529;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 10px;
    font-weight: bold;
    transition: all 0.2s;
    user-select: none;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.background = '#e0a800';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.background = '#ffc107';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Mini pause button clicked!');
    pauseAudio();
  });
  
  return button;
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('Text selected:', selectedText);
    console.log('isPlaying state:', isPlaying);
    console.log('playButton exists:', !!playButton);
    
    // Hide existing play button, chunk indicator, and audio controls
    if (playButton) {
      playButton.style.display = 'none';
    }
    if (chunkIndicator) {
      chunkIndicator.style.display = 'none';
    }
    if (audioControls) {
      audioControls.style.display = 'none';
    }
    
    // Show play button if text is selected and not currently playing
    if (selectedText && selectedText.length > 0 && !isPlaying) {
      console.log('Conditions met, creating play button');
      if (!playButton) {
        playButton = createPlayButton();
        document.body.appendChild(playButton);
        console.log('Play button created');
      }
      
      if (!chunkIndicator) {
        chunkIndicator = createChunkIndicator();
        document.body.appendChild(chunkIndicator);
        console.log('Chunk indicator created');
      }
      
      // Position button next to selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      playButton.style.display = 'flex';
      playButton.style.left = (rect.right + window.scrollX + 8) + 'px';
      playButton.style.top = (rect.top + window.scrollY - 2) + 'px';
      
      // Position chunk indicator next to play button
      chunkIndicator.style.display = 'none'; // Hidden until actually playing
      chunkIndicator.style.left = (rect.right + window.scrollX + 40) + 'px';
      chunkIndicator.style.top = (rect.top + window.scrollY + 2) + 'px';
      
      console.log('Play button positioned at:', rect.right, rect.top);
      console.log('Play button display:', playButton.style.display);
    } else {
      console.log('Conditions not met:', {
        hasText: !!selectedText,
        textLength: selectedText ? selectedText.length : 0,
        isPlaying: isPlaying
      });
    }
  }, 150);
});

// Prevent button from being hidden by other clicks
document.addEventListener('click', (e) => {
  if (playButton && playButton.contains(e.target)) {
    console.log('Click on play button, not hiding');
    return;
  }
  if (audioControls && audioControls.contains(e.target)) {
    console.log('Click on audio controls, not hiding');
    return;
  }
  
  // Hide play button, chunk indicator, and audio controls
  if (playButton) {
    playButton.style.display = 'none';
  }
  if (chunkIndicator) {
    chunkIndicator.style.display = 'none';
  }
  if (audioControls) {
    audioControls.style.display = 'none';
  }
});

// Hide button when scrolling
window.addEventListener('scroll', () => {
  if (playButton) {
    playButton.style.display = 'none';
  }
  if (chunkIndicator) {
    chunkIndicator.style.display = 'none';
  }
  if (audioControls) {
    audioControls.style.display = 'none';
  }
});

// Hide button when window is resized
window.addEventListener('resize', () => {
  if (playButton) {
    playButton.style.display = 'none';
  }
  if (chunkIndicator) {
    chunkIndicator.style.display = 'none';
  }
  if (audioControls) {
    audioControls.style.display = 'none';
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'audioEnded') {
    console.log('Audio ended notification received');
    isPlaying = false;
    currentChunk = 0;
    totalChunks = 0;
    
    // Hide pause button
    if (pauseButton) {
      pauseButton.style.display = 'none';
    }
    
    // Hide chunk indicator
    hideChunkIndicator();
    
    // Hide audio controls
    hideAudioControls();
    
    // Reset play button
    if (playButton) {
      playButton.innerHTML = '▶';
      playButton.style.cursor = 'pointer';
      playButton.style.background = '#007bff';
      playButton.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
      playButton.style.display = 'none';
    }
  }
  
  if (request.action === 'chunkUpdate') {
    console.log('Chunk update received:', request);
    currentChunk = request.currentChunk;
    totalChunks = request.totalChunks;
    updateChunkIndicator(currentChunk, totalChunks);
  }
  
  if (request.action === 'audioStarted') {
    console.log('Audio started notification received');
    isPlaying = true;
    
    // Hide play button and show audio controls
    if (playButton) {
      playButton.style.display = 'none';
    }
    showAudioControls(false); // Show pause button
  }
  
  if (request.action === 'audioPaused') {
    console.log('Audio paused notification received');
    isPlaying = false;
    
    // Show play button in controls
    showAudioControls(true); // Show play button
  }
  
  if (request.action === 'audioResumed') {
    console.log('Audio resumed notification received');
    isPlaying = true;
    
    // Show pause button in controls
    showAudioControls(false); // Show pause button
  }
});

// Pause current audio
function pauseAudio() {
  if (isPlaying) {
    chrome.runtime.sendMessage({ action: 'pauseAudio' }, (response) => {
      if (response && response.success) {
        isPlaying = false;
        
        // Hide pause button
        if (pauseButton) {
          pauseButton.style.display = 'none';
        }
        
        // Show play button again if there's a selection
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText && selectedText.length > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          if (playButton) {
            playButton.innerHTML = '▶';
            playButton.style.cursor = 'pointer';
            playButton.style.background = '#007bff';
            playButton.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
            playButton.style.display = 'flex';
            playButton.style.left = (rect.right + window.scrollX + 8) + 'px';
            playButton.style.top = (rect.top + window.scrollY - 2) + 'px';
          }
        }
      } else {
        console.error('Background pause error:', response?.error);
      }
    });
  }
}

// Speak the selected text - handles TTS directly without popup
async function speakSelectedText() {
  const selectedText = window.getSelection().toString().trim();
  
  if (!selectedText) {
    console.log('No selected text to speak');
    return;
  }
  
  console.log('Starting TTS for:', selectedText);
  
  try {
    // Show loading state
    if (playButton) {
      playButton.innerHTML = '...';
      playButton.style.cursor = 'wait';
      playButton.style.background = '#ffc107';
      playButton.style.boxShadow = '0 4px 12px rgba(255,193,7,0.4)';
    }
    
    const voice = 'af_heart';
    const lang_code = voice[0]; // Extract language code from voice
    
    // Check if text needs chunking
    if (selectedText.length > 500) {
      return await speakChunkedText(selectedText, voice);
    }
    
    console.log('Sending TTS request:', { text: selectedText, voice, lang_code });
    
    const response = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: selectedText,
        voice: voice,
        speed: 1.0, // Always generate at 1x speed
        lang_code: lang_code,
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
      // Show chunk indicator for single chunk
      updateChunkIndicator(1, 1);
      
      const audioUrl = `http://localhost:8000${result.audio_url}`;
      console.log('Sending audio to background for playback:', audioUrl);
      
      // Send audio URL to background script for persistent playback
      chrome.runtime.sendMessage({
        action: 'playAudio',
        audioUrl: audioUrl
      }, (response) => {
        if (response && response.success) {
          isPlaying = true;
          
          // Hide play button and show audio controls
          if (playButton) {
            playButton.style.display = 'none';
          }
          showAudioControls(false); // Show pause button
          
          // Show pause button in top-right corner
          if (!pauseButton) {
            pauseButton = createPauseButton();
            document.body.appendChild(pauseButton);
          }
          pauseButton.style.display = 'flex';
        } else {
          console.error('Background audio error:', response?.error);
          showError('Audio play failed');
          
          // Reset play button on error
          if (playButton) {
            playButton.innerHTML = '▶';
            playButton.style.cursor = 'pointer';
            playButton.style.background = '#007bff';
            playButton.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
          }
          hideChunkIndicator();
        }
      });
      
    } else {
      throw new Error('Failed to generate speech');
    }
    
  } catch (error) {
    console.error('TTS Error:', error);
    showError(error.message);
    hideChunkIndicator();
  }
}

// Show error state
function showError(message) {
  console.log('Showing error:', message);
  if (playButton) {
    playButton.innerHTML = 'X';
    playButton.style.cursor = 'pointer';
    playButton.style.background = '#dc3545';
    playButton.style.boxShadow = '0 4px 12px rgba(220,53,69,0.4)';
    
    setTimeout(() => {
      if (playButton) {
        playButton.innerHTML = '▶';
        playButton.style.cursor = 'pointer';
        playButton.style.background = '#007bff';
        playButton.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
      }
    }, 3000);
  }
}

// Chunked speech generation for long texts in content script
async function speakChunkedText(text, voice) {
  const chunks = splitTextIntoChunks(text, 400); // 400 chars per chunk for safety
  console.log(`Content script: Split text into ${chunks.length} chunks`);
  
  totalChunks = chunks.length;
  currentChunk = 0;
  
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
    
    // Update chunk indicator for first chunk
    updateChunkIndicator(1, totalChunks);
    
    // Start playing first chunk
    const firstAudioUrl = `http://localhost:8000${firstResult.audio_url}`;
    chrome.runtime.sendMessage({
      action: 'playAudio',
      audioUrl: firstAudioUrl
    }, (response) => {
      if (response && response.success) {
        isPlaying = true;
        
        // Hide play button and show audio controls
        if (playButton) {
          playButton.style.display = 'none';
        }
        showAudioControls(false); // Show pause button
        
        // Show pause button in top-right corner
        if (!pauseButton) {
          pauseButton = createPauseButton();
          document.body.appendChild(pauseButton);
        }
        pauseButton.style.display = 'flex';
      } else {
        console.error('Background audio error:', response?.error);
        showError('Audio play failed');
        
        // Reset play button on error
        if (playButton) {
          playButton.innerHTML = '▶';
          playButton.style.cursor = 'pointer';
          playButton.style.background = '#007bff';
          playButton.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
        }
        hideChunkIndicator();
      }
    });
    
    // Pre-generate remaining chunks in background
    generateRemainingChunksContent(chunks.slice(1), voice);
    
    return Promise.resolve();
    
  } catch (error) {
    console.error('Chunked TTS Error:', error);
    showError(error.message);
    hideChunkIndicator();
    return Promise.reject(error);
  }
}

// Split text into smart chunks (same as popup.js)
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

// Generate remaining chunks and queue them for playback (content script version)
async function generateRemainingChunksContent(chunks, voice) {
  for (let i = 0; i < chunks.length; i++) {
    try {
      // Wait a bit before generating next chunk to not overwhelm the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        console.error(`Content script: Failed to generate chunk ${i + 2}`);
        continue;
      }
      
      const result = await response.json();
      if (result.success && result.audio_url) {
        const audioUrl = `http://localhost:8000${result.audio_url}`;
        
        // Update chunk indicator
        currentChunk = i + 2; // +2 because i starts at 0 and we already played chunk 1
        updateChunkIndicator(currentChunk, totalChunks);
        
        // Queue this chunk for playback
        chrome.runtime.sendMessage({
          action: 'queueAudio',
          audioUrl: audioUrl
        });
      }
      
    } catch (error) {
      console.error(`Content script: Error generating chunk ${i + 2}:`, error);
    }
  }
}

console.log('Kokoro TTS content script loaded');
