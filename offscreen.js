// Offscreen document script for audio playback
let currentAudio = null;
let isPlaying = false;
let audioQueue = [];
let isQueueProcessing = false;
let currentSpeed = 1.0;

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
      hasAudio: currentAudio !== null,
      isPaused: currentAudio !== null && !isPlaying && currentAudio.paused,
      queueLength: audioQueue.length
    });
    return true;
  }
  
  if (request.action === 'queueAudio') {
    queueAudio(request.audioUrl);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'setSpeed') {
    setPlaybackSpeed(request.speed);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getSpeed') {
    sendResponse({ speed: currentSpeed });
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
    currentAudio.playbackRate = currentSpeed; // Set current speed
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
      
      // Notify background script that audio started
      chrome.runtime.sendMessage({ action: 'audioStarted' });
    });
    
    currentAudio.addEventListener('ended', () => {
      console.log('Offscreen audio ended');
      isPlaying = false;
      currentAudio = null;
      
      // Process next item in queue if available
      processNextInQueue();
      
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
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    isPlaying = false;
    console.log('Offscreen audio paused');
    
    // Notify background script that audio paused
    chrome.runtime.sendMessage({ action: 'audioPaused' });
  }
}

// Resume current audio
function resumeAudio() {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().then(() => {
      isPlaying = true;
      console.log('Offscreen audio resumed');
      
      // Notify background script that audio resumed
      chrome.runtime.sendMessage({ action: 'audioResumed' });
    }).catch(error => {
      console.error('Offscreen audio resume error:', error);
    });
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
  
  // Clear queue when stopping
  audioQueue = [];
  isQueueProcessing = false;
}

// Queue audio for playback
function queueAudio(audioUrl) {
  console.log('Queueing audio:', audioUrl);
  audioQueue.push(audioUrl);
  
  // Start processing queue if not already playing
  if (!isPlaying && !isQueueProcessing) {
    processNextInQueue();
  }
}

// Process next audio in queue
function processNextInQueue() {
  if (audioQueue.length === 0) {
    isQueueProcessing = false;
    return;
  }
  
  isQueueProcessing = true;
  const nextAudioUrl = audioQueue.shift();
  console.log('Processing next audio in queue:', nextAudioUrl);
  
  // Play the next audio
  playAudio(nextAudioUrl).catch(error => {
    console.error('Error playing queued audio:', error);
    // Continue to next item in queue even if this one fails
    setTimeout(() => processNextInQueue(), 100);
  });
}

// Set playback speed for current and future audio
function setPlaybackSpeed(speed) {
  currentSpeed = speed;
  console.log('Setting playback speed to:', speed);
  
  // Apply to current audio if playing
  if (currentAudio) {
    currentAudio.playbackRate = speed;
    console.log('Applied speed to current audio');
  }
}

console.log('Kokoro TTS offscreen script loaded');
