// save default settings
import { DEFAULT_SETTINGS } from './settings/defaults.js';

chrome.storage.sync.get(['settings'], (result) => {
    let settings = result.settings;

    if (!settings) {
        settings = { ...DEFAULT_SETTINGS };
        chrome.storage.sync.set({ settings: settings });
    }
});

// display survey on uninstall
chrome.runtime.setUninstallURL("https://goo.gl/forms/HiYiNh8Jq97oUOBg1");