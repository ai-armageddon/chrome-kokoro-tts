// Content script for play icon next to selected text

let playButton = null;
let pauseButton = null;
let audioControls = null;
let chunkIndicator = null;
let isPlaying = false;
let currentChunk = 0;
let totalChunks = 0;
let highlightedSpans = [];
let highlightedRange = null;
let lastSelectedText = '';
let lastSelectedRange = null;
let highlightEnabled = true; // Default to enabled

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
    
    // Hide the button immediately
    if (playButton) {
      playButton.style.display = 'none';
    }
    
    // Call the same function that the popup uses, with cached selection
    generateSpeechFromSelectedText(lastSelectedText, lastSelectedRange);
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
      lastSelectedText = selectedText;
      try {
        // Clone the range immediately to preserve it
        if (selection.rangeCount > 0) {
          lastSelectedRange = selection.getRangeAt(0).cloneRange();
          
          // Store the text content in a more robust way
          const range = selection.getRangeAt(0);
          const contents = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(contents);
          lastSelectedText = tempDiv.textContent || tempDiv.innerText || selectedText;
        } else {
          lastSelectedRange = null;
        }
      } catch (e) {
        console.error('Error caching selection range:', e);
        lastSelectedRange = null;
      }
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
      lastSelectedText = '';
      lastSelectedRange = null;
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
  
  // Small delay to allow button click to process
  setTimeout(() => {
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
  }, 10);
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
    
    // Clear highlighting
    clearHighlighting();
    
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
  
  if (request.action === 'setHighlightEnabled') {
    highlightEnabled = request.enabled;
    console.log('Highlight enabled:', highlightEnabled);
    
    // Clear highlighting if disabled
    if (!highlightEnabled) {
      clearHighlighting();
    }
  }
  
  if (request.action === 'audioStarted') {
    console.log('Audio started notification received for chunk:', request.chunkIndex);
    
    // Update chunk indicator
    if (totalChunks > 1) {
      updateChunkIndicator((request.chunkIndex || 0) + 1, totalChunks);
    }
    
    // Highlight the current chunk
    if (highlightedRange && request.chunkText && highlightEnabled) {
      try {
        highlightChunk(request.chunkText, request.chunkIndex || 0);
      } catch (e) {
        console.error('Error highlighting chunk:', e);
      }
    }
  }
  
  if (request.action === 'chunkUpdate') {
    console.log('Chunk update received:', request);
    currentChunk = request.currentChunk;
    totalChunks = request.totalChunks;
    updateChunkIndicator(currentChunk, totalChunks);
    
    // Update highlighting for current chunk
    if (request.chunkText) {
      highlightChunk(request.chunkText, currentChunk - 1);
    }
  }
  
  if (request.action === 'audioStarted') {
    console.log('Audio started notification received');
    isPlaying = true;
    
    // Highlight the chunk if provided
    if (request.chunkText && request.chunkIndex !== undefined) {
      highlightChunk(request.chunkText, request.chunkIndex);
    }
    
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

// Generate speech from selected text (same as popup)
async function generateSpeechFromSelectedText() {
  // Use cached text instead of current selection
  const selectedText = lastSelectedText;
  
  if (!selectedText) {
    console.log('No selected text to speak');
    return;
  }
  
  // Use the cached range for highlighting
  highlightedRange = lastSelectedRange;
  
  console.log('Starting TTS for:', selectedText);
  
  try {
    // Show loading state
    if (playButton) {
      playButton.innerHTML = '...';
      playButton.style.cursor = 'wait';
      playButton.style.background = '#ffc107';
      playButton.style.boxShadow = '0 4px 12px rgba(255,193,7,0.4)';
      playButton.style.display = 'flex';
    }
    
    const voice = 'af_heart';
    const lang_code = voice[0]; // Extract language code from voice
    
    // Check if text needs chunking
    if (selectedText.length > 400) {
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
      
      // Highlight the entire text for single chunk
      try {
        if (highlightedRange) {
          highlightChunk(selectedText, 0);
        }
      } catch (e) {
        console.error('Error highlighting text:', e);
        // Continue without highlighting if it fails
      }
      
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

// Hide chunk indicator
function hideChunkIndicator() {
  if (chunkIndicator) {
    chunkIndicator.style.display = 'none';
  }
}

// Speak the selected text - handles TTS directly without popup
async function speakSelectedText() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    console.log('No selected text to speak');
    return;
  }
  
  // Save the selection range for highlighting
  if (selection.rangeCount > 0 && selection.getRangeAt(0)) {
    try {
      highlightedRange = selection.getRangeAt(0).cloneRange();
    } catch (e) {
      console.error('Error cloning range:', e);
      highlightedRange = null;
    }
  } else {
    highlightedRange = null;
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
    if (selectedText.length > 400) {
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
      
      try {
        // Highlight the entire text for single chunk
        if (highlightedRange) {
          highlightChunk(selectedText, 0);
        }
      } catch (e) {
        console.error('Error highlighting text:', e);
        // Continue without highlighting if it fails
      }
      
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
    try {
    // Highlight the first chunk immediately
    if (highlightedRange) {
      highlightChunk(chunks[0], 0);
    }
} catch (e) {
    console.error('Error highlighting first chunk:', e);
    // Continue without highlighting if it fails
}
    
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
      audioUrl: firstAudioUrl,
      chunkText: chunks[0],
      chunkIndex: 0
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
  
  // Split by sentences first - improved regex to handle quotes and parentheses
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]?\s*/g) || [text];
  
  for (const sentence of sentences) {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) continue;
    
    if (currentChunk.length + cleanSentence.length <= maxChunkSize) {
      currentChunk += cleanSentence;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // If single sentence is too long, split it by clauses
      if (cleanSentence.length > maxChunkSize) {
        // Try to split by commas, semicolons, or dashes first
        const clauses = cleanSentence.split(/[,;—-]/);
        let clauseChunk = '';
        
        for (const clause of clauses) {
          const trimmedClause = clause.trim();
          if (!trimmedClause) continue;
          
          if (clauseChunk.length + trimmedClause.length + 2 <= maxChunkSize) {
            clauseChunk += (clauseChunk ? ', ' : '') + trimmedClause;
          } else {
            if (clauseChunk.trim()) {
              chunks.push(clauseChunk.trim());
            }
            
            // If clause is still too long, split by words
            if (trimmedClause.length > maxChunkSize) {
              const words = trimmedClause.split(' ');
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
                clauseChunk = wordChunk;
              } else {
                clauseChunk = '';
              }
            } else {
              clauseChunk = trimmedClause;
            }
          }
        }
        
        if (clauseChunk.trim()) {
          currentChunk = clauseChunk;
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = cleanSentence;
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
      
      console.log(`Content script: Generating chunk ${i + 2} of ${chunks.length + 1}`);
      console.log(`Chunk text: "${chunks[i].substring(0, 100)}..."`);
      
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
        
        console.log(`Content script: Successfully generated chunk ${i + 2}`);
        
        // Queue this chunk for playback
        chrome.runtime.sendMessage({
          action: 'queueAudio',
          audioUrl: audioUrl,
          chunkText: chunks[i],
          chunkIndex: i + 1
        }, (response) => {
          if (response && response.success) {
            console.log(`Content script: Successfully queued chunk ${i + 2}`);
          } else {
            console.error(`Content script: Failed to queue chunk ${i + 2}:`, response?.error);
          }
        });
      }
      
    } catch (error) {
      console.error(`Content script: Error generating chunk ${i + 2}:`, error);
    }
  }
}

// Clear all highlighting
function clearHighlighting() {
  // Remove highlight styles from all spans
  highlightedSpans.forEach(span => {
    if (span && span.parentNode) {
      span.style.backgroundColor = '';
      span.style.color = '';
      span.style.transition = '';
    }
  });
  highlightedSpans = [];
  
  // Don't clear the saved range - keep it for chunking
}

// Highlight specific chunk of text with two-color system
function highlightChunk(chunkText, chunkIndex) {
  console.log('=== HIGHLIGHT DEBUG ===');
  console.log('highlightEnabled:', highlightEnabled);
  console.log('highlightedRange exists:', !!highlightedRange);
  console.log('chunkText length:', chunkText ? chunkText.length : 0);
  console.log('chunkIndex:', chunkIndex);
  
  if (!highlightedRange || !chunkText || !highlightEnabled) {
    console.log('No highlighted range or chunk text to highlight, or highlighting disabled');
    return;
  }
  
  // Simple test: highlight the entire range
  try {
    console.log('Attempting to highlight...');
    
    // Clear previous highlighting
    clearHighlighting();
    
    // Clone the range
    const range = highlightedRange.cloneRange();
    
    // Create a simple highlight span
    const span = document.createElement('span');
    span.style.backgroundColor = '#FFE066';
    span.style.color = '#000';
    span.style.borderRadius = '2px';
    span.style.padding = '1px 2px';
    
    // Surround the range
    range.surroundContents(span);
    highlightedSpans.push(span);
    
    console.log('Highlight applied successfully!');
    console.log('=== END HIGHLIGHT DEBUG ===');
    
  } catch (e) {
    console.error('Error highlighting text:', e);
    console.log('=== END HIGHLIGHT DEBUG ===');
  }
}

// Helper function to highlight specific text within the range
function highlightTextInRange(textToHighlight, bgColor, textColor) {
  if (!textToHighlight) return;
  
  const range = highlightedRange.cloneRange();
  const contents = range.cloneContents();
  
  const container = document.createElement('div');
  container.appendChild(contents);
  const fullText = container.textContent || container.innerText || '';
  
  const chunkStart = fullText.indexOf(textToHighlight);
  if (chunkStart === -1) return;
  
  const chunkEnd = chunkStart + textToHighlight.length;
  
  // Create a tree walker to find text nodes
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let currentPos = 0;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;
  
  // Find the start and end nodes for the chunk
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeText = node.textContent;
    const nodeLength = nodeText.length;
    
    // Check if chunk starts in this node
    if (!startNode && currentPos + nodeLength >= chunkStart) {
      startNode = node;
      startOffset = chunkStart - currentPos;
    }
    
    // Check if chunk ends in this node
    if (currentPos + nodeLength >= chunkEnd) {
      endNode = node;
      endOffset = chunkEnd - currentPos;
      break;
    }
    
    currentPos += nodeLength;
  }
  
  // If we found the start and end, create the highlight
  if (startNode && endNode) {
    const highlightRange = document.createRange();
    highlightRange.setStart(startNode, startOffset);
    highlightRange.setEnd(endNode, endOffset);
    
    // Apply highlight styling
    const span = document.createElement('span');
    highlightRange.surroundContents(span);
    
    // Style the highlighted span
    span.style.backgroundColor = bgColor;
    span.style.color = textColor;
    span.style.transition = 'background-color 0.3s ease';
    span.style.borderRadius = '2px';
    span.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
    
    highlightedSpans.push(span);
    
    // Scroll the highlight into view if needed
    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

console.log('Kokoro TTS content script loaded');
