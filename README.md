# Kokoro TTS Chrome Extension

A Chrome extension that provides text-to-speech functionality by connecting to a local instance of the Kokoro TTS API. 

> **Important Note**: This extension requires a separate installation of the Kokoro TTS API running locally. The API is not included in this extension and must be set up separately.

## Features

- 🎙️ Connects to your local Kokoro TTS API instance
- 🖱️ Right-click on selected text to speak it
- 🎚️ Playback controls with pause/resume functionality
- 🎧 Background audio that continues when popup is closed
- 🎨 Clean and intuitive user interface

## Prerequisites

Before using this extension, you'll need:

1. **Kokoro TTS API** - A local instance must be running on `http://localhost:8000`
   - The API is not included with this extension
   - You can find the Kokoro TTS API at: [Kokoro TTS GitHub Repository](https://github.com/kokoro-ai/kokoro-tts) (or the appropriate repository)
   - Follow the API's setup instructions to run it locally

2. Google Chrome or any Chromium-based browser

## Installation

### 1. Set up Kokoro TTS API (Required)

Before installing this extension, you must have the Kokoro TTS API running locally:

```bash
# Example - replace with actual installation instructions for Kokoro TTS API
git clone https://github.com/kokoro-ai/kokoro-tts.git
cd kokoro-tts
# Follow the API's setup instructions
# Make sure the API is running on http://localhost:8000
```

### 2. Install the Chrome Extension

1. Clone this repository:
```bash
git clone https://github.com/yourusername/kokoro-tts-extension.git
cd kokoro-tts-extension
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked" and select the extension directory
   - The extension icon should appear in your Chrome toolbar

## Usage

1. **First, ensure the Kokoro TTS API is running** on `http://localhost:8000`
2. Use the extension through the popup or context menu
3. Control playback using the provided controls

### Using the Popup

1. Click the extension icon in the Chrome toolbar
2. Enter text in the textarea or click "Use Selected" to get selected text
3. Choose a voice from the dropdown
4. Click "Speak Text" to start playback

### Using Context Menu

1. Select any text on a webpage
2. Right-click and select "Speak with Kokoro TTS"
3. The selected text will be spoken immediately

### Playback Controls

- **Pause**: Pause the current audio
- **Resume**: Resume paused audio
- **Stop**: Stop playback completely

## Development

This extension is designed to work with a local Kokoro TTS API instance. The API handles all the text-to-speech processing, while this extension provides the browser interface.

### Project Structure

- `background.js` - Manages communication with the Kokoro TTS API
- `content.js` - Handles in-page text selection and play button
- `popup/` - Contains the extension's popup interface
- `offscreen/` - Manages audio playback in a separate context

## Troubleshooting

- **"Error playing audio"**: Ensure the Kokoro TTS API is running on `http://localhost:8000`
- **No sound**: Check your system volume and ensure the API is properly configured
- **Connection issues**: Verify no other service is using port 8000

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This extension is not affiliated with or endorsed by the Kokoro TTS project. It is a third-party client that connects to a locally running instance of the Kokoro TTS API.
