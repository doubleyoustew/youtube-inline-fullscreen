# Youtube Inline Fullscreen

**Make the most out of your screen space with a single click!**  
A free Chrome extension that gives YouTube a proper fullscreen experience — without going into browser fullscreen mode.

## Features

- 🖥️ **Inline Fullscreen**: Fill your entire browser window with the video player, no borders or sidebars.
- 🎯 **Responsive Layout**: Comments, suggestions, and other UI elements stay accessible.
- ⚡ **Fast Toggle**: Use the extension icon, the custom button inside the YouTube player, or a keyboard shortcut.
- 🔍 **Search in Fullscreen**: Press `s` to toggle the search bar without leaving fullscreen mode.

## Keyboard Shortcuts

| Shortcut | Action                          |
|----------|---------------------------------|
| `w`      | Toggle inline fullscreen mode   |
| `s`      | Show/hide YouTube search bar    |

## Installation

You can install the extension directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/mfpkbigjnlcgngkdbmnchfnenfmibkig).

> **Note**: After installing, reload any open YouTube tabs for the player button to appear.

## Development

To build or modify the extension locally:

1. Clone the repo  
2. Install dependencies:

    ```bash
    npm install
    ```

3. Compile styles:

    ```bash
    npm run sass        # Compile once
    npm run sass:watch  # Watch for changes
    ```

Then load the extension into Chrome via the [Extensions page](chrome://extensions), enable Developer Mode, and click **Load unpacked**.

## License

This project is licensed under the **GNU General Public License v3.0**.

You are free to use, modify, and distribute this software, provided that any derivative works are also licensed under the GPL. This ensures that improvements remain open and benefit the community.

See the [LICENSE](LICENSE) file for full terms.