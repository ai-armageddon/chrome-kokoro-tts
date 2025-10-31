// Offscreen document script for audio playback
let currentAudio = null;
let isPlaying = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Offscreen received message:', request);
  
  if (request.action === 'playAudio') {
    playAudio(request.audioUrl).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Offscreen audio play error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'pauseAudio') {
    pauseAudio();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'resumeAudio') {
    resumeAudio().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Offscreen audio resume error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'stopAudio') {
    stopAudio();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getAudioStatus') {
    sendResponse({ 
      isPlaying: isPlaying, 
      hasAudio: currentAudio !== null 
    });
    return true;
  }
});

// Play audio from URL
async function playAudio(audioUrl) {
  try {
    // Stop any existing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    console.log('Offscreen playing audio:', audioUrl);
    
    currentAudio = new Audio(audioUrl);
    isPlaying = true;
    
    // Set up audio event listeners
    currentAudio.addEventListener('loadeddata', () => {
      console.log('Offscreen audio data loaded');
    });
    
    currentAudio.addEventListener('canplay', () => {
      console.log('Offscreen audio can play, starting playback');
      currentAudio.play().catch(error => {
        console.error('Offscreen audio play error:', error);
        isPlaying = false;
      });
    });
    
    currentAudio.addEventListener('ended', () => {
      console.log('Offscreen audio ended');
      isPlaying = false;
      currentAudio = null;
      
      // Notify background script that audio ended
      chrome.runtime.sendMessage({ action: 'audioEnded' });
    });
    
    currentAudio.addEventListener('pause', () => {
      console.log('Offscreen audio paused');
      isPlaying = false;
    });
    
    currentAudio.addEventListener('error', (e) => {
      console.error('Offscreen audio error:', e);
      isPlaying = false;
      currentAudio = null;
    });
    
    // Load and play
    currentAudio.load();
    
  } catch (error) {
    console.error('Offscreen playAudio error:', error);
    isPlaying = false;
    throw error;
  }
}

// Pause current audio
function pauseAudio() {
  if (currentAudio && isPlaying) {
    currentAudio.pause();
    isPlaying = false;
    console.log('Offscreen audio paused');
  }
}

// Resume current audio
async function resumeAudio() {
  if (currentAudio && !isPlaying) {
    try {
      await currentAudio.play();
      isPlaying = true;
      console.log('Offscreen audio resumed');
    } catch (error) {
      console.error('Offscreen audio resume error:', error);
      throw error;
    }
  }
}

// Stop current audio
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    isPlaying = false;
    console.log('Offscreen audio stopped');
  }
}

console.log('Kokoro TTS offscreen script loaded');
