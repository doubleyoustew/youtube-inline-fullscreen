# Youtube Inline Fullscreen

**Make the most out of your screen space with a single click!**  
A free Chrome extension that gives YouTube a proper fullscreen experience — without going into browser fullscreen mode.

## Features

- 🖥️ **Inline Fullscreen**: Fill your entire browser window with the video player, no borders or sidebars.
- 🎯 **Responsive Layout**: Comments, suggestions, and other UI elements stay accessible.
- ⚡ **Fast Toggle**: Use the custom button inside the YouTube player, or a keyboard shortcut.
- 🛠️ **Customizable Settings**: Click the extension icon to open a menu where you can adjust the behavior to your liking.

## Keyboard Shortcuts

| Shortcut | Action                          |
|----------|---------------------------------|
| `d`      | Toggle inline fullscreen mode   |

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

### Firefox / Zen

Since Chromium and current Firefox/Zen builds require different MV3 background configurations, the Firefox manifest is provided separately rather than modifying the existing Chromium manifest. Firefox uses the `background.scripts` configuration in this manifest.

To load the extension in Firefox or Zen Browser:

1. Open `about:debugging`.
2. Select **This Firefox** (or the equivalent temporary-add-on page in Zen).
3. Click **Load Temporary Add-on...** and choose `app/manifest.firefox.json`.

Chrome and Chromium browsers should continue using `app/manifest.json` from the [Extensions page](chrome://extensions).

## License

This project is licensed under the **GNU General Public License v3.0**.

You are free to use, modify, and distribute this software, provided that any derivative works are also licensed under the GPL. This ensures that improvements remain open and benefit the community.

See the [LICENSE](LICENSE) file for full terms.
