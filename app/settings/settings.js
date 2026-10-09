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
      } else if (
        element.type === 'text' ||
        element.type === 'color'
      ) {
        element.value = settings[key];
      } else if (element.tagName.toLowerCase() === 'select') {
        element.value = settings[key];
      }
    }

    // Update keyboard shortcut display
    document.getElementById('displayFullscreenShortcut').textContent =
      settings.fullscreenShortcut;
  });

  // Save the settings when the user changes something
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const element = document.getElementById(key);

    if (!element) return;

    element.addEventListener('change', () => {
      const value =
        element.type === 'checkbox'
          ? element.checked
          : element.value;

      browserAPI.storage.sync.get(['settings'], (result) => {
        let settings = result.settings || { ...DEFAULT_SETTINGS };

        settings[key] = value;

        browserAPI.storage.sync.set({ settings });

        document.getElementById(
          'displayFullscreenShortcut'
        ).textContent = settings.fullscreenShortcut;
      });
    });
  });

  // Handle edit shortcut clicked
  document
    .getElementById('editFullscreenShortcut')
    .addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector('.ytif-swap').classList.add('ytif-active');
      document.getElementById('fullscreenShortcut').focus();
    });

  // Handle shortcut reset to default
  document
    .getElementById('cancelShortcut')
    .addEventListener('click', function (e) {
      e.preventDefault();

      const input = document.getElementById('fullscreenShortcut');
      input.value = DEFAULT_SETTINGS.fullscreenShortcut;
      input.dispatchEvent(new Event('change'));

      document.querySelector('.ytif-swap').classList.remove('ytif-active');
    });

  // Handle shortcut edit dismiss
  document
    .getElementById('saveShortcut')
    .addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector('.ytif-swap').classList.remove('ytif-active');
    });

  // Handle shortcut edit input
  document
    .getElementById('fullscreenShortcut')
    .addEventListener('keydown', function (e) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();

        if (/^[a-z]$/.test(e.key)) {
          this.value = e.key;
          this.dispatchEvent(new Event('change'));
        }
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
  document
    .getElementById('toggleFullscreen')
    .addEventListener('click', function () {
      checkInstalled(true);
    });

  /**
   * Check if content script was loaded (it won't be on first install)
   */
  function checkInstalled(doToggleFullscreen = false) {

    browserAPI.tabs.query(
      { active: true, currentWindow: true },
      function (tabs) {

        if (tabs[0].url?.includes('youtube.com/watch')) {

          browserAPI.tabs.sendMessage(
            tabs[0].id,
            { checkInstalled: true },
            function () {

              if (browserAPI.runtime.lastError) {

                browserAPI.scripting.insertCSS({
                  target: { tabId: tabs[0].id },
                  files: ['ytif_style.css']
                });

                browserAPI.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  files: ['ytif_content_script.js']
                });

                if (doToggleFullscreen) {
                  setTimeout(() => {
                    browserAPI.tabs.sendMessage(
                      tabs[0].id,
                      { toggleFullScreen: true }
                    );
                  }, 200);
                }

              } else if (doToggleFullscreen) {

                browserAPI.tabs.sendMessage(
                  tabs[0].id,
                  { toggleFullScreen: true }
                );

              }
            }
          );
        }
      }
    );
  }

});
