# 🎤 Kokoro TTS Chrome Extension - Complete Usage Guide

## 🚀 Quick Start

**Get up and running in 5 minutes:**

1. **Start the API server**: `./start_kokoro_api.sh`
2. **Install Chrome extension**: Load current folder in Chrome
3. **Click the extension icon** and start converting text to speech!

---

## 📋 Table of Contents

- [Installation](#installation)
- [API Server Management](#api-server-management)
- [Chrome Extension Setup](#chrome-extension-setup)
- [Daily Usage](#daily-usage)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [File Structure](#file-structure)

---

## 🛠️ Installation

### Prerequisites Check

```bash
# Verify Python 3.10+ is installed
python3 --version

# Verify Node.js and PM2 are installed
node --version && pm2 --version
```

### Step 1: Setup Python Environment

```bash
# Navigate to project directory
cd /Users/ai_armageddon/builds/Extensions/Chrome-Extensions/Kokoro-Chrome-TTS

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Start the API Server

```bash
# Make startup script executable
chmod +x start_kokoro_api.sh

# Start the API server
./start_kokoro_api.sh
```

**Expected output:**
```
🎤 Starting Kokoro TTS API Server...
🚀 Starting API server with PM2...
✅ Kokoro TTS API is running on http://localhost:8000
```

### Step 3: Install Chrome Extension

1. **Open Chrome Extensions**: `chrome://extensions/`
2. **Enable Developer Mode**: Toggle top-right switch
3. **Load Extension**: Click "Load unpacked" → Select current folder
4. **Verify**: Kokoro TTS icon appears in Chrome toolbar

---

## 🖥️ API Server Management

### Starting the Server

```bash
# Method 1: Use the startup script (recommended)
./start_kokoro_api.sh

# Method 2: Use PM2 directly
pm2 start ecosystem.config.js

# Method 3: Manual start (for testing)
source venv/bin/activate
python api_server.py
```

### Checking Server Status

```bash
# Check PM2 process status
pm2 status

# Check API health
curl http://localhost:8000/health

# View real-time logs
pm2 logs kokoro-tts-api
```

### Server Management Commands

```bash
# Restart the server
pm2 restart kokoro-tts-api

# Stop the server
pm2 stop kokoro-tts-api

# Delete the process
pm2 delete kokoro-tts-api

# View server logs
pm2 logs kokoro-tts-api --lines 50

# Monitor server performance
pm2 monit
```

---

## 🌐 Chrome Extension Setup

### Installation Steps

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle "Developer mode" (top right)
   - Additional options will appear

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to: `/Users/ai_armageddon/builds/Extensions/Chrome-Extensions/Kokoro-Chrome-TTS`
   - Select the folder and click "Select"

4. **Verify Installation**
   - Kokoro TTS icon appears in toolbar
   - Click icon to open popup
   - Should show "Cannot connect to Kokoro API" if server isn't running

---

## 📖 Daily Usage

### Basic Text-to-Speech

1. **Open Extension**: Click Kokoro TTS icon in toolbar
2. **Enter Text**: Type or paste text in the text area
3. **Configure Settings**:
   - Choose voice from dropdown
   - Adjust speed with slider (0.5x - 2.0x)
4. **Generate**: Click "Generate Speech"
5. **Play Audio**: Use built-in audio player

### Using Selected Text

**Method 1: Extension Button**
1. Select text on any webpage
2. Click Kokoro TTS extension icon
3. Click "Use Selected Text" button
4. Text appears in extension popup
5. Generate speech as usual

**Method 2: Context Menu**
1. Select text on any webpage
2. Right-click and select "Speak with Kokoro TTS"
3. Text is automatically processed

### Voice Options

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

---

## ⚡ Advanced Features

### Settings Persistence

The extension automatically saves:
- Last used voice
- Preferred speed setting
- Recent text entries

### API Integration

The extension communicates with these endpoints:

```javascript
// Health check
GET http://localhost:8000/health

// Get available voices
GET http://localhost:8000/voices

// Generate speech
POST http://localhost:8000/tts
{
  "text": "Your text here",
  "voice": "af_heart",
  "speed": 1.0,
  "return_phonemes": false
}

// Download audio
GET http://localhost:8000/audio/{file_id}
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Cannot connect to Kokoro API"

**Solutions**:
1. **Check API server status**:
   ```bash
   pm2 status
   curl http://localhost:8000/health
   ```

2. **Restart API server**:
   ```bash
   pm2 restart kokoro-tts-api
   ```

3. **Check logs for errors**:
   ```bash
   pm2 logs kokoro-tts-api --lines 20
   ```

#### Audio Not Playing

**Solutions**:
1. **Check browser audio permissions**
2. **Try different browser**
3. **Verify audio file was created**:
   ```bash
   curl -I http://localhost:8000/audio/{file_id}
   ```

---

## 📁 File Structure

### Complete Project Structure
```
Kokoro-Chrome-TTS/
├── api_server.py              # FastAPI server
├── ecosystem.config.js        # PM2 configuration
├── start_kokoro_api.sh        # Startup script
├── requirements.txt           # Python dependencies
├── venv/                      # Python virtual environment
├── logs/                      # Server logs
├── manifest.json             # Extension manifest
├── popup.html               # Extension popup UI
├── popup.js                 # Popup logic
├── content.js               # Page interaction script
├── background.js            # Background script
├── offscreen.html           # Offscreen document
├── offscreen.js             # Offscreen script
├── README.md                # This documentation
└── CHROME_EXTENSION_GUIDE.md # Detailed guide
```

---

## 🎯 Best Practices

### For Daily Use

1. **Keep text segments under 1000 characters** for better performance
2. **Use af_sky or af_heart** for most general purposes
3. **Speed 1.0-1.2x** works best for most content

### For Development

1. **Always check API health** before testing
2. **Monitor PM2 logs** for error tracking
3. **Restart server daily** for optimal performance

---

## 📞 Support & Resources

### Quick Commands Reference

```bash
# Start everything
./start_kokoro_api.sh

# Check status
pm2 status && curl http://localhost:8000/health

# View logs
pm2 logs kokoro-tts-api

# Restart
pm2 restart kokoro-tts-api

# Stop
pm2 stop kokoro-tts-api
```

### Useful URLs

- **API Health**: http://localhost:8000/health
- **Available Voices**: http://localhost:8000/voices
- **API Documentation**: http://localhost:8000/docs
- **Chrome Extensions**: chrome://extensions/

---

## 🎉 Success! 

You now have a fully functional TTS system with:
- ✅ **Local API server** running with PM2
- ✅ **Chrome extension** for easy access
- ✅ **Multiple voices** and speed controls
- ✅ **Context menu** integration
- ✅ **Persistent settings** and preferences
- ✅ **Production-ready** monitoring and logging

Enjoy converting text to natural-sounding speech with Kokoro TTS! 🎤
