import { DEFAULT_SETTINGS } from './defaults.js';

const browserAPI = globalThis.chrome ?? globalThis.browser;

// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', function () {
  // check if content script is installed
  checkInstalled();

  // Load settings when the popup opens
  browserAPI.storage.sync.get(['settings'], (result) => {
    let settings = result.settings;

    // Merge defaults with saved settings
    settings = { ...DEFAULT_SETTINGS, ...settings };

    // Save back merged settings in case there were new defaults
    browserAPI.storage.sync.set({ settings });

    // Loop through all settings and write the values to the input fields
    for (const key in settings) {
      const element = document.getElementById(key);
      if (!element) continue;

      if (element.type === 'checkbox') {
        element.checked = settings[key];
      } else if (element.type === 'text' || element.type === 'color') {
        element.value = settings[key];
      } else if (element.tagName.toLowerCase() === 'select') {
        element.value = settings[key];
      }
    }

    // Update keyboard shortcut display
    document.getElementById('displayFullscreenShortcut').textContent = shortcutLabel(
      settings.fullscreenShortcut
    );
  });

  // Save the settings when the user changes something
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const element = document.getElementById(key);

    if (!element) return;

    element.addEventListener('change', () => {
      const value = element.type === 'checkbox' ? element.checked : element.value;

      browserAPI.storage.sync.get(['settings'], (result) => {
        let settings = result.settings || { ...DEFAULT_SETTINGS };

        settings[key] = value;

        browserAPI.storage.sync.set({ settings });

        document.getElementById('displayFullscreenShortcut').textContent = shortcutLabel(
          settings.fullscreenShortcut
        );
      });
    });
  });

  // Handle edit shortcut clicked
  document.getElementById('editFullscreenShortcut').addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector('.ytif-swap').classList.add('ytif-active');
    document.getElementById('fullscreenShortcut').focus();
  });

  // Handle shortcut reset to default
  document.getElementById('cancelShortcut').addEventListener('click', function (e) {
    e.preventDefault();

    const input = document.getElementById('fullscreenShortcut');
    input.value = DEFAULT_SETTINGS.fullscreenShortcut;
    input.dispatchEvent(new Event('change'));

    document.querySelector('.ytif-swap').classList.remove('ytif-active');
  });

  // Handle shortcut disable
  document.getElementById('disableShortcut').addEventListener('click', function (e) {
    e.preventDefault();

    const input = document.getElementById('fullscreenShortcut');
    input.value = '';
    input.dispatchEvent(new Event('change'));

    document.querySelector('.ytif-swap').classList.remove('ytif-active');
  });

  // Handle shortcut edit dismiss
  document.getElementById('saveShortcut').addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector('.ytif-swap').classList.remove('ytif-active');
  });

  // Handle shortcut edit input
  document.getElementById('fullscreenShortcut').addEventListener('keydown', function (e) {
    // allow copy & paste shortcuts to work as usual
    if (e.ctrlKey || e.metaKey) return;

    // only intercept the keys used for shortcut selection (single letters),
    // so that Tab, Escape, arrow keys, etc. keep their default behavior
    if (!/^[a-zA-Z]$/.test(e.key)) return;

    e.preventDefault();

    // ignore shifted letters, which would produce an invalid shortcut
    if (!e.shiftKey) {
      this.value = e.key;
      this.dispatchEvent(new Event('change'));
    }
  });

  // Open links in new tab
  document.querySelectorAll('a.open-tab').forEach((link) => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      browserAPI.tabs.create({ url: link.href });
    });
  });

  // Handle toggle fullscreen button
  document.getElementById('toggleFullscreen').addEventListener('click', function () {
    checkInstalled(true);
  });

  /**
   * display label for the fullscreen shortcut
   */
  function shortcutLabel(value) {
    return value || 'Disabled';
  }

  /**
   * in-flight content script installations, keyed by tab id,
   * so the popup and the toggle button cannot inject concurrently
   */
  const installingTabs = new Map();

  /**
   * ensure the content script is installed in the given tab,
   * sharing an in-flight installation between concurrent callers
   */
  function ensureInstalled(tabId) {
    let promise = installingTabs.get(tabId);
    if (!promise) {
      promise = installContentScript(tabId).finally(() => {
        installingTabs.delete(tabId);
      });
      installingTabs.set(tabId, promise);
    }
    return promise;
  }

  /**
   * inject the content script if it is not running yet
   */
  async function installContentScript(tabId) {
    try {
      await browserAPI.tabs.sendMessage(tabId, { checkInstalled: true });
      return;
    } catch {
      // no content script in this tab, fall through to injection
    }

    await browserAPI.scripting.insertCSS({
      target: { tabId },
      files: ['ytif_style.css'],
    });

    await browserAPI.scripting.executeScript({
      target: { tabId },
      files: ['ytif_content_script.js'],
    });
  }

  /**
   * briefly show a failed state on the toggle button
   */
  function flashToggleError() {
    const button = document.getElementById('toggleFullscreen');
    if (!button) return;

    button.textContent = 'Toggle failed';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = 'Toggle Fullscreen';
      button.disabled = false;
    }, 2000);
  }

  /**
   * Check if content script was loaded (it won't be on first install),
   * installing it when needed before an optional toggle is sent
   */
  async function checkInstalled(doToggleFullscreen = false) {
    let tab;
    try {
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
    } catch (error) {
      console.error('YouTube Inline Fullscreen: failed to query active tab', error);
      if (doToggleFullscreen) {
        flashToggleError();
      }
      return;
    }

    if (!tab?.url?.includes('youtube.com/watch')) return;

    try {
      await ensureInstalled(tab.id);
      if (doToggleFullscreen) {
        await browserAPI.tabs.sendMessage(tab.id, { toggleFullScreen: true });
      }
    } catch (error) {
      console.error('YouTube Inline Fullscreen: failed to install content script', error);
      if (doToggleFullscreen) {
        flashToggleError();
      }
    }
  }
});
