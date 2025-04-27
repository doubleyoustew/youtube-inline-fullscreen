// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', function () {

  // Define the default settings
  const defaultSettings = {
    autoEnable: false
  };

  // Load settings when the popup opens
  chrome.storage.sync.get(['settings'], (result) => {
    let settings = result.settings;

    // If no settings are saved, use the default settings
    if (!settings) {
      settings = { ...defaultSettings };
      // Save the default settings to storage
      chrome.storage.sync.set({ settings: settings });
    }

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
  });

  // Save the settings when the user changes something
  Object.keys(defaultSettings).forEach((key) => {
    const element = document.getElementById(key);
    console.log(element);
    if (!element) return;

    element.addEventListener('change', (event) => {
      const value = element.type === 'checkbox' ? element.checked : element.value;

      chrome.storage.sync.get(['settings'], (result) => {
        let settings = result.settings || { ...defaultSettings };  // Fallback to defaultSettings

        settings[key] = value;  // Update the specific setting

        // Save the updated settings object back to storage
        chrome.storage.sync.set({ settings: settings });
      });
    });
  });


});