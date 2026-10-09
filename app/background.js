const browserAPI = globalThis.chrome ?? globalThis.browser;

// Intentional duplicate of settings/defaults.js — keep the two in sync!
// This file cannot import the module: the Firefox manifest loads the
// background as a classic script (background.scripts), which does not
// support ES module imports. The seeding below is what makes the
// extension work immediately on a fresh install, before the user has
// opened the settings popup. `npm test` (scripts/check-defaults.mjs)
// fails if the two objects drift apart.
const DEFAULT_SETTINGS = {
  autoEnable: false,
  showButton: true,
  fullscreenShortcut: 'd',
};

// save default settings
browserAPI.storage.sync.get(['settings'], (result) => {
  let settings = result.settings;

  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    browserAPI.storage.sync.set({ settings });
  }
});

// display survey on uninstall
browserAPI.runtime.setUninstallURL('https://goo.gl/forms/HiYiNh8Jq97oUOBg1');
