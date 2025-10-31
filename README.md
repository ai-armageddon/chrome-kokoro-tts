# Kokoro TTS Chrome Extension

A Chrome extension that provides text-to-speech functionality using the Kokoro TTS API. This extension allows you to:

- Convert selected text to speech directly from the context menu
- Use a popup interface to enter custom text for TTS
- Control playback with play/pause/stop functionality
- Continue audio playback even when the popup is closed

## Features

- 🎙️ High-quality TTS using Kokoro TTS API
- 🖱️ Right-click on selected text to speak it
- 🎚️ Control playback with intuitive controls
- 🎧 Background audio playback
- 🎨 Clean and modern UI

## Prerequisites

Before using this extension, you'll need:

1. Kokoro TTS API running locally on `http://localhost:8000`
2. Google Chrome or any Chromium-based browser

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/kokoro-tts-extension.git
cd kokoro-tts-extension
```

### 2. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the extension directory
4. The extension should now appear in your Chrome toolbar

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

### Playback Controls

- **Pause**: Pause the current audio
- **Resume**: Resume paused audio
- **Stop**: Stop playback completely

## Development

### Project Structure

- `background.js` - Handles background processes and audio playback
- `content.js` - Manages the in-page play button for selected text
- `popup/` - Contains the popup UI and logic
- `offscreen/` - Handles audio playback in a separate context

### Building

No build step is required as this is a vanilla JavaScript extension.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Kokoro TTS for the high-quality text-to-speech API
- Chrome Extension documentation for the excellent API reference
