# Aura Reader

🌌 A Chrome extension that reads any page aloud with local AI voices — hover a paragraph, tap a hotkey, and follow the glowing highlight. Powered by the Kokoro TTS engine running on a local API server.

## 🌐 Repository

**GitHub**: https://github.com/ai-armageddon/chrome-kokoro-tts.git

## 🎯 Features

- 🎙️ **High-quality voices** - 9 different voice options (American & British English)
- 🖱️ **Text selection icon** - Blue play button appears next to selected text
- 🎚️ **Playback controls** - Pause, resume, and stop functionality
- 🎧 **Background audio** - Continues playing when popup is closed
- 🎨 **Clean interface** - Intuitive user-friendly design
- ⚡ **Fast performance** - Local processing with minimal latency
- 🔧 **Easy setup** - Automated installation and startup scripts

## Prerequisites

- Python 3.10 or higher
- Node.js and npm (for PM2 process management)
- Google Chrome or any Chromium-based browser

## Quick Start (5 minutes)

### 1. Setup the API Server

```bash
# Clone this repository
git clone https://github.com/ai-armageddon/chrome-kokoro-tts.git
cd chrome-kokoro-tts

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
chmod +x start_kokoro_api.sh
./start_kokoro_api.sh
```

### 2. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked" and select the current directory
4. The Kokoro TTS icon should appear in your Chrome toolbar

### 3. Start Using

1. Click the extension icon in the Chrome toolbar
2. Enter text in the textarea or select text on a webpage
3. Choose a voice and adjust speed if desired
4. Click "Speak Text" to start playback

## Usage

### Text Selection (Primary Method)

1. **Select any text** on a webpage
2. **Blue play button (▶)** appears next to your selection
3. **Click the play button** to start speaking the selected text
4. **Audio controls** appear for pause/stop functionality

### Using the Popup

1. Click the extension icon in the Chrome toolbar
2. Enter text in the textarea or click "Use Selected" to get selected text
3. Choose a voice from the dropdown
4. Click "Speak Text" to start playback

### Available Voices

| Voice | Language | Gender | Description |
|-------|----------|--------|-------------|
| af_heart | American English | Female | Warm, friendly |
| af_sky | American English | Female | Clear, professional |
| af_sarah | American English | Female | Natural |
| af_nicole | American English | Female | Soft |
| af_sweet | American English | Female | Gentle |
| am_adam | American English | Male | Standard male |
| am_michael | American English | Male | Deep male |
| bf_ema | British English | Female | British accent |
| bm_isaac | British English | Male | British male |

### Playback Controls

- **Play Button (▶)**: Appears next to selected text - click to speak
- **Mini Controls**: Replace play button during playback
  - **Pause (❚❚)**: Pause current audio
  - **Play (▶)**: Resume paused audio  
  - **Stop (■)**: Stop playback completely
- **Fixed Pause Button**: Red button in top-right corner during playback

## Project Structure

```
chrome-kokoro-tts/
├── api_server.py              # FastAPI TTS server
├── start_kokoro_api.sh        # Startup script
├── ecosystem.config.js        # PM2 configuration
├── requirements.txt           # Python dependencies
├── manifest.json             # Chrome extension manifest
├── popup.html               # Extension popup UI
├── popup.js                 # Popup logic
├── content.js               # Page interaction script (text selection)
├── background.js            # Background script
├── offscreen.html           # Offscreen document
├── offscreen.js             # Offscreen script
├── README.md                # This file
└── CHROME_EXTENSION_GUIDE.md # Detailed usage guide
```

## API Server Management

### Starting the Server

```bash
# Use the startup script (recommended)
./start_kokoro_api.sh

# Or use PM2 directly
pm2 start ecosystem.config.js

# Or manual start for testing
source venv/bin/activate
python api_server.py
```

### Server Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs kokoro-tts-api

# Restart server
pm2 restart kokoro-tts-api

# Stop server
pm2 stop kokoro-tts-api
```

## Troubleshooting

### Common Issues

- **"Play button doesn't appear when selecting text"**: 
  - Reload the extension in `chrome://extensions/`
  - Check browser console for JavaScript errors
  - Ensure content.js is properly loaded

- **"Cannot connect to Kokoro API"**: 
  - Ensure the API server is running on `http://localhost:8000`
  - Check if the server started successfully

- **No sound**: 
  - Check your system volume
  - Ensure browser has audio permissions
  - Verify API is properly configured

- **Connection issues**: 
  - Verify no other service is using port 8000
  - Check firewall settings

- **Extension not loading**: 
  - Check Chrome developer console for errors
  - Ensure all files are present in the directory

For detailed troubleshooting and advanced usage, see [CHROME_EXTENSION_GUIDE.md](CHROME_EXTENSION_GUIDE.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is not affiliated with or endorsed by the original Kokoro TTS project. It is a self-contained package that combines the Kokoro TTS model with a Chrome extension interface.
