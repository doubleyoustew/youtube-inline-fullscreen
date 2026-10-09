const browserAPI = globalThis.chrome ?? globalThis.browser;

const DEFAULT_SETTINGS = {
  autoEnable: false,
  showButton: true,
  fullscreenShortcut: "d"
};

// save default settings
browserAPI.storage.sync.get(["settings"], (result) => {
  let settings = result.settings;

  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    browserAPI.storage.sync.set({ settings });
  }
});

// display survey on uninstall
browserAPI.runtime.setUninstallURL("https://goo.gl/forms/HiYiNh8Jq97oUOBg1");
