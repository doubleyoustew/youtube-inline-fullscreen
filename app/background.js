(function (chrome) {

    // display survey on uninstall
    chrome.runtime.setUninstallURL("https://goo.gl/forms/HiYiNh8Jq97oUOBg1");

    /**
     * event listener for extension icon clicked
     */
    chrome.action.onClicked.addListener(function () {

        // get active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

            // if active tab is on youtube
            if (tabs[0].url && tabs[0].url.indexOf("youtube.com/watch") !== -1) {
                checkInstalled(tabs[0].id);
            }
        });
    });

    /**
     * check if content script was loaded (it won't be on first install)
     * @param {number} activeTab 
     */
    function checkInstalled(activeTab) {
        
        chrome.tabs.sendMessage(activeTab, { checkInstalled: true }, function (response) {
            if (chrome.runtime.lastError) {
                injectScripts(activeTab);
            } else {
                toggleFullScreen(activeTab);
            }
        });
    }

    /**
     * inject content js and css then toggle fullscreen
     */
    function injectScripts(activeTab) {
        chrome.scripting.insertCSS({ 
            target: {tabId: activeTab}, 
            files: ["ytif_style.css"] 
        });
        chrome.scripting.executeScript({
            target: {tabId: activeTab}, 
            files: ["ytif_content_script.js"]
        });
        setTimeout(() => { toggleFullScreen(activeTab); }, 200);
    }

    /**
     * sends message to content script to toggle fullscreen
     * @param {number} activeTab 
     */
    function toggleFullScreen(activeTab) {
        chrome.tabs.sendMessage(activeTab, { toggleFullScreen: true });
    }

})(chrome);
