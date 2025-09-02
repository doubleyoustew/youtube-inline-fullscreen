import { DEFAULT_SETTINGS } from './defaults.js';

// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', function () {

  // check if content script is installed
  checkInstalled();

  // Load settings when the popup opens
  chrome.storage.sync.get(['settings'], (result) => {
    let settings = result.settings;

    // Merge defaults with saved settings
    settings = { ...DEFAULT_SETTINGS, ...settings };

    // Save back merged settings in case there were new defaults
    chrome.storage.sync.set({ settings: settings });

    // Loop through all settings and write the values to the input fields
    for (const key in settings) {
      const element = document.getElementById(key);
      if (!element) continue;

      if (element.type === 'checkbox') {
        element.checked = settings[key];  // Set checkbox state
      } else if (element.type === 'text' || element.type === 'color') {
        element.value = settings[key];  // Set text/color field value
      } else if (element.tagName.toLowerCase() === 'select') {
        element.value = settings[key];  // Set select field value
      }
    }

    // update keyboard shortcut display
    console.log(settings.fullscreenShortcut);
    document.getElementById('displayFullscreenShortcut').innerHTML = settings.fullscreenShortcut;
  });

  // Save the settings when the user changes something
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const element = document.getElementById(key);

    if (!element) return;

    element.addEventListener('change', (event) => {
      console.log("change event");
      const value = element.type === 'checkbox' ? element.checked : element.value;
      chrome.storage.sync.get(['settings'], (result) => {
        let settings = result.settings || { ...DEFAULT_SETTINGS };  // Fallback to DEFAULT_SETTINGS

        settings[key] = value;  // Update the specific setting

        // Save the updated settings object back to storage
        chrome.storage.sync.set({ settings: settings });
        // update keyboard shortcut display
        document.getElementById('displayFullscreenShortcut').innerHTML = settings.fullscreenShortcut;
      });
    });
  });

  // handle edit shortcut clicked
  document.getElementById('editFullscreenShortcut').addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector('.ytif-swap').classList.add('ytif-active');
    document.getElementById('fullscreenShortcut').focus();
  });

  // handle shortcut reset to default
  document.getElementById('cancelShortcut').addEventListener('click', function (e) {
    e.preventDefault();
    const input = document.getElementById('fullscreenShortcut');
    input.value = DEFAULT_SETTINGS.fullscreenShortcut;
    input.dispatchEvent(new Event("change"));
    document.querySelector('.ytif-swap').classList.remove('ytif-active');
  });

  // handle shortcut edit dismiss
  document.getElementById('saveShortcut').addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector('.ytif-swap').classList.remove('ytif-active');
  });

  // handle shortcut edit input
  document.getElementById('fullscreenShortcut').addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (/^[a-z]$/.test(e.key)) {
        this.value = e.key;
        this.dispatchEvent(new Event("change"));
      }
    }
  });

  // Open links in new tab
  document.querySelectorAll('a.open-tab').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault(); // prevent regular link behavior
      chrome.tabs.create({ url: link.href });
    });
  });

  // handle toggle fullscreen button
  document.getElementById('toggleFullscreen').addEventListener('click', function () {
    checkInstalled(true);
  });

  /**
   * check if content script was loaded (it won't be on first install)
   * @param {number} activeTab 
   */
  function checkInstalled(doToggleFullscreen = false) {

    // get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

      // if active tab is on youtube
      if (tabs[0].url && tabs[0].url.indexOf("youtube.com/watch") !== -1) {
        chrome.tabs.sendMessage(tabs[0].id, { checkInstalled: true }, function (response) {
          if (chrome.runtime.lastError) {
            chrome.scripting.insertCSS({
              target: { tabId: tabs[0].id },
              files: ["ytif_style.css"]
            });
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ["ytif_content_script.js"]
            });
            if (doToggleFullscreen) {
              console.log('TOGGLE');
              setTimeout(() => { chrome.tabs.sendMessage(tabs[0].id, { toggleFullScreen: true }); }, 200);
            }
          } else if (doToggleFullscreen) {
            console.log('TOGGLE 2');
            chrome.tabs.sendMessage(tabs[0].id, { toggleFullScreen: true });
          }
        });
      }
    });
  }

});