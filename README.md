# Kokoro TTS Chrome Extension - Complete Package

A complete, self-contained text-to-speech solution that includes both the Kokoro TTS API server and a Chrome extension for easy browser-based access.

## 🎯 What's Included

- 🖥️ **Local Kokoro TTS API Server** - FastAPI-based backend with multiple voices
- 🌐 **Chrome Extension** - Browser interface for text-to-speech
- 🚀 **One-click Setup** - Startup scripts and PM2 process management
- 📚 **Complete Documentation** - Setup guides and usage instructions

## Features

- 🎙️ **High-quality voices** - 9 different voice options (American & British English)
- 🖱️ **Right-click to speak** - Context menu integration for selected text
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
git clone <repository-url>
cd Kokoro-Chrome-TTS

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

### Using the Popup

1. Click the extension icon in the Chrome toolbar
2. Enter text in the textarea or click "Use Selected" to get selected text
3. Choose a voice from the dropdown
4. Click "Speak Text" to start playback

### Using Context Menu

1. Select any text on a webpage
2. Right-click and select "Speak with Kokoro TTS"
3. The selected text will be spoken immediately

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

- **Pause**: Pause the current audio
- **Resume**: Resume paused audio
- **Stop**: Stop playback completely

## Project Structure

```
Kokoro-Chrome-TTS/
├── api_server.py              # FastAPI TTS server
├── start_kokoro_api.sh        # Startup script
├── ecosystem.config.js        # PM2 configuration
├── requirements.txt           # Python dependencies
├── venv/                      # Python virtual environment
├── logs/                      # Server logs
├── manifest.json             # Chrome extension manifest
├── popup.html               # Extension popup UI
├── popup.js                 # Popup logic
├── content.js               # Page interaction script
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

- **"Cannot connect to Kokoro API"**: Ensure the API server is running on `http://localhost:8000`
- **No sound**: Check your system volume and ensure the API is properly configured
- **Connection issues**: Verify no other service is using port 8000
- **Extension not loading**: Check Chrome developer console for errors

For detailed troubleshooting and advanced usage, see [CHROME_EXTENSION_GUIDE.md](CHROME_EXTENSION_GUIDE.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is not affiliated with or endorsed by the original Kokoro TTS project. It is a self-contained package that combines the Kokoro TTS model with a Chrome extension interface.
