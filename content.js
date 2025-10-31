// Content script for play icon next to selected text

let playButton = null;
let pauseButton = null;
let isPlaying = false;

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

// Create pause button element
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

// Handle text selection
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('Text selected:', selectedText);
    
    // Hide existing play button
    if (playButton) {
      playButton.style.display = 'none';
    }
    
    // Show play button if text is selected and not currently playing
    if (selectedText && selectedText.length > 0 && !isPlaying) {
      if (!playButton) {
        playButton = createPlayButton();
        document.body.appendChild(playButton);
        console.log('Play button created');
      }
      
      // Position button next to selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      playButton.style.display = 'flex';
      playButton.style.left = (rect.right + window.scrollX + 8) + 'px';
      playButton.style.top = (rect.top + window.scrollY - 2) + 'px';
      
      console.log('Play button positioned at:', rect.right, rect.top);
    }
  }, 150);
});

// Prevent button from being hidden by other clicks
document.addEventListener('click', (e) => {
  if (playButton && playButton.contains(e.target)) {
    console.log('Click on play button, not hiding');
    return;
  }
  
  if (pauseButton && pauseButton.contains(e.target)) {
    console.log('Click on pause button, not hiding');
    return;
  }
  
  // Hide play button when clicking elsewhere (with delay to allow selection)
  setTimeout(() => {
    if (playButton && !playButton.contains(e.target)) {
      playButton.style.display = 'none';
    }
  }, 50);
});

// Hide button when scrolling
window.addEventListener('scroll', () => {
  if (playButton) {
    playButton.style.display = 'none';
  }
});

// Hide button when window is resized
window.addEventListener('resize', () => {
  if (playButton) {
    playButton.style.display = 'none';
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'audioEnded') {
    console.log('Audio ended notification received');
    isPlaying = false;
    
    // Hide pause button
    if (pauseButton) {
      pauseButton.style.display = 'none';
    }
    
    // Reset play button
    if (playButton) {
      playButton.innerHTML = '▶';
      playButton.style.cursor = 'pointer';
      playButton.style.background = '#007bff';
      playButton.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
      playButton.style.display = 'none';
    }
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
    
    console.log('Sending TTS request:', { text: selectedText, voice, lang_code });
    
    const response = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: selectedText,
        voice: voice,
        speed: 1.0,
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
      // Show playing state
      if (playButton) {
        playButton.innerHTML = '~';
        playButton.style.background = '#28a745';
        playButton.style.boxShadow = '0 4px 12px rgba(40,167,69,0.4)';
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
        }
      });
      
    } else {
      throw new Error('Failed to generate speech');
    }
    
  } catch (error) {
    console.error('TTS Error:', error);
    showError(error.message);
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

console.log('Kokoro TTS content script loaded');
