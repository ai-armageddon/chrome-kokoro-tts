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
    // Get current speed before playing
    chrome.runtime.sendMessage({ action: 'getSpeed' }, (speedResponse) => {
      if (speedResponse && speedResponse.speed !== undefined) {
        currentSpeed = speedResponse.speed;
        console.log('Offscreen: Got speed from background:', currentSpeed);
      }
      
      playAudio(request.audioUrl, request.chunkText, request.chunkIndex).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('Offscreen audio play error:', error);
        sendResponse({ success: false, error: error.message });
      });
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
    queueAudio(request.audioUrl, request.chunkText, request.chunkIndex);
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
async function playAudio(audioUrl, chunkText = null, chunkIndex = null) {
  try {
    // Stop any existing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    console.log('Offscreen playing audio:', audioUrl);
    if (chunkText) {
      console.log('Playing chunk:', chunkText.substring(0, 50) + '...');
    }
    
    currentAudio = new Audio(audioUrl);
    currentAudio.playbackRate = currentSpeed; // Set current speed
    currentAudio.volume = 1.0; // Ensure full volume
    isPlaying = true;
    
    console.log('Offscreen created audio element with URL:', audioUrl);
    console.log('Audio volume:', currentAudio.volume);
    console.log('Audio playback rate:', currentAudio.playbackRate);
    
    // Set up audio event listeners
    currentAudio.addEventListener('loadeddata', () => {
      console.log('Offscreen audio data loaded');
    });
    
    currentAudio.addEventListener('canplay', () => {
      console.log('Offscreen audio can play, starting playback');
      
      // Try to play with user interaction
      const playPromise = currentAudio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Offscreen audio playback started successfully');
        }).catch(error => {
          console.error('Offscreen audio play error:', error);
          console.error('Autoplay prevented - may need user interaction');
          isPlaying = false;
          
          // Try to play after a small delay
          setTimeout(() => {
            if (currentAudio) {
              console.log('Retrying audio play...');
              currentAudio.play().catch(e => {
                console.error('Retry failed:', e);
              });
            }
          }, 100);
        });
      }
      
      // Notify background script that audio started
      chrome.runtime.sendMessage({ 
        action: 'audioStarted',
        chunkText: chunkText,
        chunkIndex: chunkIndex
      });
    });
    
    currentAudio.addEventListener('ended', () => {
      console.log('Offscreen audio ended for chunk:', chunkIndex);
      console.log('Queue length before processing:', audioQueue.length);
      isPlaying = false;
      currentAudio = null;
      
      // Check if there are more items in queue
      const hasMoreItems = audioQueue.length > 0;
      
      // Process next item in queue if available
      if (hasMoreItems) {
        console.log('Processing next item in queue...');
        processNextInQueue();
      }
      
      // Only notify audio ended if queue is empty (all chunks played)
      if (!hasMoreItems) {
        console.log('All chunks played, sending audioEnded');
        chrome.runtime.sendMessage({ action: 'audioEnded' });
      }
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
function queueAudio(audioUrl, chunkText = null, chunkIndex = null) {
  console.log('Queueing audio:', audioUrl);
  if (chunkText) {
    console.log('Queueing chunk:', chunkText.substring(0, 50) + '...');
  }
  audioQueue.push({ url: audioUrl, text: chunkText, index: chunkIndex });
  
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
  const nextItem = audioQueue.shift();
  console.log('Processing next audio in queue:', nextItem.url);
  
  // Play the next audio
  playAudio(nextItem.url, nextItem.text, nextItem.index).catch(error => {
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
  if (currentAudio && isPlaying) {
    // Store current time before changing speed
    const currentTime = currentAudio.currentTime;
    
    // Apply new speed
    currentAudio.playbackRate = speed;
    console.log('Applied speed to current audio at time:', currentTime);
    
    // Don't pause and resume - this causes chunk repetition
    // Just set the playback rate directly
  }
}

console.log('Kokoro TTS offscreen script loaded');
