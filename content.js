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
let hoverButtonEnabled = true; // Micro play button on hovered text blocks
let auraEnabled = true; // Glow on hovered block after a short dwell
let readHotkey = { code: 'KeyR', key: 'r', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false };

// Load settings saved by the popup; storage.onChanged keeps them live in every tab
chrome.storage.local.get(
  ['kokoro-tts-highlight', 'kokoro-tts-hover-button', 'kokoro-tts-aura', 'kokoro-tts-hotkey'],
  (result) => {
    if (result['kokoro-tts-highlight'] !== undefined) highlightEnabled = !!result['kokoro-tts-highlight'];
    if (result['kokoro-tts-hover-button'] !== undefined) hoverButtonEnabled = !!result['kokoro-tts-hover-button'];
    if (result['kokoro-tts-aura'] !== undefined) auraEnabled = !!result['kokoro-tts-aura'];
    if (result['kokoro-tts-hotkey']) readHotkey = result['kokoro-tts-hotkey'];
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes['kokoro-tts-highlight']) {
    highlightEnabled = !!changes['kokoro-tts-highlight'].newValue;
    if (!highlightEnabled) clearHighlighting();
  }
  if (changes['kokoro-tts-hover-button']) {
    hoverButtonEnabled = !!changes['kokoro-tts-hover-button'].newValue;
    if (!hoverButtonEnabled) clearHoverBlock();
  }
  if (changes['kokoro-tts-aura']) {
    auraEnabled = !!changes['kokoro-tts-aura'].newValue;
    if (!auraEnabled && hoverBlock) hoverBlock.classList.remove('kokoro-aura');
  }
  if (changes['kokoro-tts-hotkey'] && changes['kokoro-tts-hotkey'].newValue) {
    readHotkey = changes['kokoro-tts-hotkey'].newValue;
  }
});

// Styles for reading highlights, the hover play button, and the hover aura
const kokoroStyles = document.createElement('style');
kokoroStyles.setAttribute('data-kokoro-ui', 'true');
kokoroStyles.textContent = `
  .kokoro-tts-hl {
    border-radius: 3px;
    padding: 1px 0;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .kokoro-tts-read {
    background-color: rgba(102, 126, 234, 0.18) !important;
  }
  .kokoro-tts-reading {
    background-color: rgba(255, 233, 125, 0.4) !important;
    background-image: linear-gradient(110deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 65%) !important;
    background-size: 300% 100% !important;
    background-repeat: no-repeat !important;
    animation: kokoro-tts-shimmer 2.6s linear infinite;
  }
  @keyframes kokoro-tts-shimmer {
    0% { background-position: 150% 0; }
    100% { background-position: -50% 0; }
  }
  .kokoro-hover-play {
    position: absolute;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.92);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    line-height: 1;
    cursor: pointer;
    z-index: 2147483646;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8);
    transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;
    user-select: none;
  }
  .kokoro-hover-play.kokoro-visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  .kokoro-hover-play:hover {
    background: rgba(84, 105, 212, 1);
    transform: scale(1.15);
  }
  /* Registered so it can transition: every aura alpha scales with this, so
     adding/removing .kokoro-aura fades the whole aura in/out instead of snapping */
  @property --kokoro-aura-fade {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
  }
  .kokoro-aura {
    --kokoro-aura-fade: 1;
    border-radius: 8px;
    /* Soft aurora wash behind the text, slowly drifting like northern lights */
    background-image: linear-gradient(115deg,
      rgb(94 234 212 / calc(var(--kokoro-aura-fade) * 14%)),
      rgb(96 165 250 / calc(var(--kokoro-aura-fade) * 11%)),
      rgb(147 112 219 / calc(var(--kokoro-aura-fade) * 14%))) !important;
    background-size: 220% 100% !important;
    transition: --kokoro-aura-fade 0.45s ease;
    animation: kokoro-aura-glow 3.2s ease-in-out infinite, kokoro-aura-drift 6s ease-in-out infinite;
  }
  @keyframes kokoro-aura-drift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  /* Outer halo + faint inner light so the block edge never reads as a hard box */
  @keyframes kokoro-aura-glow {
    0%, 100% { box-shadow: 0 0 12px 0 rgb(94 234 212 / calc(var(--kokoro-aura-fade) * 22%)), 0 0 26px 3px rgb(147 112 219 / calc(var(--kokoro-aura-fade) * 10%)), inset 0 0 14px rgb(96 165 250 / calc(var(--kokoro-aura-fade) * 7%)); }
    25% { box-shadow: 0 0 16px 2px rgb(94 234 212 / calc(var(--kokoro-aura-fade) * 34%)), 0 0 34px 6px rgb(96 165 250 / calc(var(--kokoro-aura-fade) * 14%)), inset 0 0 18px rgb(94 234 212 / calc(var(--kokoro-aura-fade) * 9%)); }
    50% { box-shadow: 0 0 18px 2px rgb(147 112 219 / calc(var(--kokoro-aura-fade) * 34%)), 0 0 38px 7px rgb(52 211 153 / calc(var(--kokoro-aura-fade) * 14%)), inset 0 0 18px rgb(147 112 219 / calc(var(--kokoro-aura-fade) * 9%)); }
    75% { box-shadow: 0 0 16px 2px rgb(96 165 250 / calc(var(--kokoro-aura-fade) * 34%)), 0 0 34px 6px rgb(216 180 254 / calc(var(--kokoro-aura-fade) * 14%)), inset 0 0 18px rgb(96 165 250 / calc(var(--kokoro-aura-fade) * 9%)); }
  }
`;
(document.head || document.documentElement).appendChild(kokoroStyles);

// Create play button element
function createPlayButton() {
  const button = document.createElement('div');
  button.setAttribute('data-kokoro-ui', 'true');
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
  controls.setAttribute('data-kokoro-ui', 'true');
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
  button.setAttribute('data-kokoro-ui', 'true');
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
  indicator.setAttribute('data-kokoro-ui', 'true');
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
  clearHoverBlock(); // Position is stale after scrolling
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
  clearHoverBlock();
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

    // Reset hover play button loading state
    if (hoverPlayBtn) {
      hoverPlayBtn.innerHTML = KOKORO_HOVER_ICON;
    }
    
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
    isPlaying = true;

    // Reset hover play button loading state
    if (hoverPlayBtn) {
      hoverPlayBtn.innerHTML = KOKORO_HOVER_ICON;
    }
    
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
    
    // Hide play button and show audio controls
    if (playButton) {
      playButton.style.display = 'none';
    }
    showAudioControls(false); // Show pause button
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

// Request TTS generation via the background script. The page itself must
// never fetch localhost: Chrome attributes that request to the website and
// shows a local-network-access permission prompt on every new site, while
// the extension's own host_permissions cover it silently.
function requestTTS(text, voice) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'generateTTS', text: text, voice: voice }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response && response.success && response.result) {
        resolve(response.result);
      } else {
        reject(new Error(response && response.error ? response.error : 'Failed to generate speech'));
      }
    });
  });
}

// Generate speech from selected text (same as popup)
async function generateSpeechFromSelectedText(showLoading = true) {
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
    if (playButton && showLoading) {
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

    const result = await requestTTS(selectedText, voice);
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

    const result = await requestTTS(selectedText, voice);
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
    const firstResult = await requestTTS(chunks[0], voice);
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
      
      const result = await requestTTS(chunks[i], voice);
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
  // Unwrap all highlight spans back to text nodes
  highlightedSpans.forEach(span => {
    if (span && span.parentNode) {
      const parent = span.parentNode;
      const textNode = document.createTextNode(span.textContent);
      parent.replaceChild(textNode, span);
      
      // Normalize to merge adjacent text nodes
      parent.normalize();
    }
  });
  highlightedSpans = [];
  
  // Don't clear the saved range - keep it for chunking
}

// Highlight specific chunk of text with two-color system
function highlightChunk(chunkText, chunkIndex) {
  if (!highlightedRange || !chunkText || !highlightEnabled) {
    return;
  }

  try {
    // Clear previous highlighting
    clearHighlighting();

    // Text of the saved range, to recompute chunk boundaries
    const container = document.createElement('div');
    container.appendChild(highlightedRange.cloneRange().cloneContents());
    const fullText = container.textContent || '';

    const chunks = splitTextIntoChunks(fullText, 400);
    console.log('Highlighting chunk', chunkIndex, 'of', chunks.length);

    // Chunks are located sequentially: each search starts where the
    // previous chunk ended, so repeated sentences stay aligned
    let searchFrom = 0;

    // Light tint on chunks that have already been read
    for (let i = 0; i < chunkIndex && i < chunks.length; i++) {
      const end = highlightTextInRange(chunks[i], 'kokoro-tts-read', searchFrom);
      if (end !== null) {
        searchFrom = end;
      }
    }

    // Shimmering highlight on the chunk currently being read
    if (chunkIndex < chunks.length) {
      highlightTextInRange(chunks[chunkIndex], 'kokoro-tts-reading', searchFrom);
    }
  } catch (e) {
    console.error('Error highlighting text:', e);
  }
}

// Find chunkText within fullText ignoring all whitespace differences.
// Needed because splitTextIntoChunks trims/rejoins sentences, so its chunks
// don't match the DOM text character-for-character (lost or collapsed
// whitespace). Returns { start, end } offsets in fullText, or null.
function findFlexiblePosition(fullText, chunkText, fromIndex) {
  const target = chunkText.replace(/\s+/g, '');
  if (!target) return null;

  // Map non-whitespace characters back to their positions in fullText
  const chars = [];
  const positions = [];
  for (let i = fromIndex; i < fullText.length; i++) {
    if (!/\s/.test(fullText[i])) {
      chars.push(fullText[i]);
      positions.push(i);
    }
  }

  const idx = chars.join('').indexOf(target);
  if (idx === -1) return null;
  return { start: positions[idx], end: positions[idx + target.length - 1] + 1 };
}

// Highlight one chunk of text within the saved range, searching from
// fromIndex (an offset into the range's text). Returns the end offset of
// the match so the caller can continue sequentially, or null if not found.
function highlightTextInRange(textToHighlight, highlightClass, fromIndex = 0) {
  if (!textToHighlight || !highlightedRange) return null;

  const range = highlightedRange;

  // Collect the text nodes intersecting the range, tracking the in-range
  // portion of each (boundary nodes may be partially selected)
  const walker = document.createTreeWalker(
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        return range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0 &&
               range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const pieces = []; // { node, from, to, walkStart }
  let walkText = '';
  while (walker.nextNode()) {
    const node = walker.currentNode;
    let from = 0;
    let to = node.textContent.length;
    if (node === range.startContainer) from = range.startOffset;
    if (node === range.endContainer) to = range.endOffset;
    pieces.push({ node: node, from: from, to: to, walkStart: walkText.length });
    walkText += node.textContent.substring(from, to);
  }

  if (pieces.length === 0) {
    console.log('No text nodes found in range');
    return null;
  }

  const pos = findFlexiblePosition(walkText, textToHighlight, fromIndex);
  if (!pos) {
    console.log('Could not find chunk text in range');
    return null;
  }

  let firstHighlightSpan = null;

  // Wrap matching portions in reverse document order so DOM edits don't
  // invalidate the offsets of earlier pieces
  for (let p = pieces.length - 1; p >= 0; p--) {
    const piece = pieces[p];
    const pieceLength = piece.to - piece.from;
    const hlStart = Math.max(0, pos.start - piece.walkStart);
    const hlEnd = Math.min(pieceLength, pos.end - piece.walkStart);
    if (hlStart >= hlEnd) continue;

    try {
      const node = piece.node;
      const nodeText = node.textContent;
      const start = piece.from + hlStart;
      const end = piece.from + hlEnd;

      const span = document.createElement('span');
      span.textContent = nodeText.substring(start, end);
      span.className = 'kokoro-tts-hl ' + highlightClass;
      span.setAttribute('data-highlight', 'true');

      const parent = node.parentNode;
      if (!parent) continue;

      const beforeText = nodeText.substring(0, start);
      const afterText = nodeText.substring(end);

      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), node);
      }
      parent.insertBefore(span, node);
      if (afterText) {
        node.textContent = afterText;
      } else {
        parent.removeChild(node);
      }

      highlightedSpans.push(span);
      firstHighlightSpan = span; // reverse loop: last assignment is first in document
    } catch (e) {
      console.error('Error highlighting text node:', e);
    }
  }

  // Follow the reading position, but only for the active chunk
  if (firstHighlightSpan && highlightClass === 'kokoro-tts-reading') {
    firstHighlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return pos.end;
}

// ===== Hover-to-read: micro play button, aura glow, and read hotkey =====

const KOKORO_BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, figcaption, pre, td, th';

let hoverPlayBtn = null;
let hoverBlock = null;
let auraTimer = null;
let hoverHideTimer = null;

// Speaker + play glyph for the hover button: the play triangle forms the
// speaker cone and sound waves mark it as audio, so it can't be mistaken
// for a video play button
const KOKORO_HOVER_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:block">'
  + '<rect x="2.6" y="9.6" width="3.6" height="4.8" rx="1.1" fill="#fff"/>'
  + '<path d="M6.2 5.2 L14.8 12 L6.2 18.8 Z" fill="#fff"/>'
  + '<path d="M16.9 9.2a4 4 0 0 1 0 5.6" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>'
  + '<path d="M19.2 6.7a7.6 7.6 0 0 1 0 10.6" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>'
  + '</svg>';

function ensureHoverPlayBtn() {
  if (hoverPlayBtn) return hoverPlayBtn;
  hoverPlayBtn = document.createElement('div');
  hoverPlayBtn.className = 'kokoro-hover-play';
  hoverPlayBtn.setAttribute('data-kokoro-ui', 'true');
  hoverPlayBtn.setAttribute('aria-label', 'Read aloud');
  hoverPlayBtn.title = 'Read aloud';
  hoverPlayBtn.innerHTML = KOKORO_HOVER_ICON;
  hoverPlayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverBlock) readBlock(hoverBlock);
  });
  document.body.appendChild(hoverPlayBtn);
  return hoverPlayBtn;
}

function clearHoverBlock() {
  if (auraTimer) {
    clearTimeout(auraTimer);
    auraTimer = null;
  }
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer);
    hoverHideTimer = null;
  }
  if (hoverBlock) {
    hoverBlock.classList.remove('kokoro-aura');
    hoverBlock = null;
  }
  if (hoverPlayBtn) {
    hoverPlayBtn.classList.remove('kokoro-visible');
  }
}

function setHoverBlock(block) {
  if (block === hoverBlock) {
    if (hoverHideTimer) {
      clearTimeout(hoverHideTimer);
      hoverHideTimer = null;
    }
    return;
  }
  clearHoverBlock();
  hoverBlock = block;

  if (hoverButtonEnabled) {
    const btn = ensureHoverPlayBtn();
    btn.innerHTML = KOKORO_HOVER_ICON;
    const rect = block.getBoundingClientRect();
    let left = rect.left + window.scrollX - 28;
    if (left < 2) left = 2;
    btn.style.left = left + 'px';
    btn.style.top = (rect.top + window.scrollY + 1) + 'px';
    btn.classList.add('kokoro-visible');
  }

  if (auraEnabled) {
    // Aura fades in after a short dwell to mark the hotkey target
    auraTimer = setTimeout(() => {
      if (hoverBlock === block) {
        block.classList.add('kokoro-aura');
      }
    }, 500);
  }
}

document.addEventListener('mouseover', (e) => {
  if (!hoverButtonEnabled && !auraEnabled) return;
  const target = e.target;
  if (!(target instanceof Element)) return;

  // Moving onto our own UI keeps the current hover block active
  if (target.closest('[data-kokoro-ui]')) {
    if (hoverHideTimer) {
      clearTimeout(hoverHideTimer);
      hoverHideTimer = null;
    }
    return;
  }

  const block = target.closest(KOKORO_BLOCK_SELECTOR);
  if (block && (block.textContent || '').trim().length >= 10) {
    setHoverBlock(block);
  } else if (hoverBlock && !hoverHideTimer) {
    // Grace period so the pointer can cross the gap to the play button
    hoverHideTimer = setTimeout(() => {
      hoverHideTimer = null;
      clearHoverBlock();
    }, 250);
  }
});

// Read a whole text block (from the hover button or the hotkey)
function readBlock(block) {
  const text = (block.textContent || '').trim();
  if (!text) return;
  const range = document.createRange();
  range.selectNodeContents(block);
  if (hoverPlayBtn && hoverPlayBtn.classList.contains('kokoro-visible')) {
    hoverPlayBtn.textContent = '⋯';
  }
  startReading(text, range);
}

// Stop any current playback, then start reading the given text.
// Text and range are captured here because the mouseup handler clears
// lastSelectedText shortly after any click.
function startReading(text, range) {
  const begin = () => {
    lastSelectedText = text;
    lastSelectedRange = range;
    generateSpeechFromSelectedText(false);
  };
  if (isPlaying) {
    chrome.runtime.sendMessage({ action: 'stopAudio' }, () => {
      isPlaying = false;
      clearHighlighting();
      begin();
    });
  } else {
    begin();
  }
}

// Hotkey: read the selection if there is one, otherwise the hovered block
document.addEventListener('keydown', (e) => {
  if (!readHotkey || (!readHotkey.code && !readHotkey.key)) return;
  // Match on physical key code, falling back to e.key when either side
  // lacks a code (some virtual/remote keyboards omit it)
  const keyMatches = readHotkey.code && e.code
    ? e.code === readHotkey.code
    : !!(e.key && readHotkey.key && e.key.toLowerCase() === readHotkey.key.toLowerCase());
  if (!keyMatches) return;
  if (e.altKey !== !!readHotkey.altKey || e.ctrlKey !== !!readHotkey.ctrlKey ||
      e.shiftKey !== !!readHotkey.shiftKey || e.metaKey !== !!readHotkey.metaKey) return;

  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : '';

  if (selectedText && selection.rangeCount > 0) {
    e.preventDefault();
    startReading(selectedText, selection.getRangeAt(0).cloneRange());
  } else if (hoverBlock) {
    e.preventDefault();
    readBlock(hoverBlock);
  }
}, true);

console.log('Aura Reader content script loaded');
