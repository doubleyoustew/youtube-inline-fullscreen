(function () {

    // holds user preference of theater or normal mode
    let userPreferredView;

    // isTransitioning: if true, we're in the process of entering or leaving fullscreen
    let isTransitioning = false;

    // yt-navigate-finish fires on page load and also when navigating without a page reload
    // note: fires a little too ear23ly so that some functionality is not available yet.
    document.body.addEventListener('yt-navigate-finish', () => {

        // add fullscreen button
        addButton();

        // exit fullscreen if navigating away from a video
        exitFullscreenOnNavigation();

    });

    // yt-player-updated triggers when the player is ready.
    // mostly needed because the theater mode toggle is not ready before so things like autoEnable need to go here.
    document.body.addEventListener('yt-player-updated', () => {

        // Automatically enable fullscreen mode
        chrome.storage.sync.get('settings', function (result) {
            const settings = result.settings || {};  // Default to an empty object if not set
            const autoEnable = settings.autoEnable || false;  // Default to false if autoEnable is not set

            if (window.location.pathname.includes('/watch')) {

                // handle auto enable
                if (autoEnable) {
                    if (!isFullscreen()) {
                        toggleFullScreen();
                    }
                }

                // if auto enable is off, check if we need to restore the theater mode toggle
                // otherwise store preference in local variable
                chrome.storage.sync.get('userPreferredView', function (result) {
                    if (!autoEnable) {
                        if (!isFullscreen()) {
                            if (result.userPreferredView && getPlayerMode() != result.userPreferredView) {
                                toggleTheaterView();
                            }
                            chrome.storage.sync.set({ userPreferredView: null });
                        }
                    } else {
                        if (result.userPreferredView) {
                            userPreferredView = result.userPreferredView;
                        }
                    }
                });
            }
        });
    });

    // add button after fresh install and first click of the extension icon
    addButton();

    // listen to keyboard shortcuts
    document.body.addEventListener('keydown', shortcutListener);

    // observe settings object so that chainging options such as "Show Player Button" is applied immediately
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.settings) {
            const { oldValue = {}, newValue = {} } = changes.settings;

            if (oldValue.showButton !== newValue.showButton) {
                if (newValue.showButton) {
                    addButton();
                } else {
                    removeButton();
                }
            }

            if (oldValue.autoEnable !== newValue.autoEnable) {
                if (newValue.autoEnable && !isFullscreen()) {
                    toggleFullScreen();
                } else if (!newValue.autoEnable && isFullscreen()) {
                    toggleFullScreen();
                }
            }
        }
    });

    /**
     * Searchbar / Masthead autohide logic
     */
    let inactivityTimeout;
    let mastheadBehaviorEnabled = false;

    const masthead = document.getElementById('masthead');

    function showMasthead() {
        if (masthead) masthead.style.display = 'block';
    }

    function hideMasthead() {
        if (document.activeElement?.getAttribute('name') !== 'search_query') {
            if (masthead) masthead.style.display = 'none';
        } else {
            // Input is still focused — keep showing and restart inactivity timer
            startInactivityTimer();
        }
    }

    function startInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(hideMasthead, 3000);
    }

    function onMouseMove() {
        showMasthead();
        startInactivityTimer();
    }

    function onMouseLeave() {
        if (document.activeElement?.getAttribute('name') === 'search_query') {
            document.activeElement.blur();
        }
        hideMasthead();
    }

    function onFocusIn() {
        if (document.activeElement?.getAttribute('name') === 'search_query') {
            clearTimeout(inactivityTimeout);
            showMasthead();
        }
    }

    function onFocusOut() {
        startInactivityTimer();
    }

    function enableMastheadAutoHide() {
        if (mastheadBehaviorEnabled) return; // already enabled
        mastheadBehaviorEnabled = true;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);

        hideMasthead(); // Start hidden by default

        // listen for player stop to show masthead
        document.querySelector('.video-stream').addEventListener('pause', showMastheadOnPlayerStop);
    }

    function showMastheadOnPlayerStop() {
        disableMastheadAutoHide();
        document.querySelector('.video-stream').removeEventListener('pause', showMastheadOnPlayerStop);
        document.querySelector('.video-stream').addEventListener('play', handleHideMastheadOnResume);
    }

    function handleHideMastheadOnResume() {
        setTimeout(enableMastheadAutoHide, 3000);
        document.querySelector('.video-stream').removeEventListener('play', handleHideMastheadOnResume);
    }

    function disableMastheadAutoHide() {
        if (!mastheadBehaviorEnabled) return; // already disabled
        mastheadBehaviorEnabled = false;

        clearTimeout(inactivityTimeout);

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('focusout', onFocusOut);

        showMasthead(); // Keep masthead always visible when disabled
    }

    /**
     * listen to messages from settings script
     */
    chrome.runtime.onMessage.addListener(function (request, sender, callback) {
        if (request.checkInstalled) {
            callback({ installed: true });
        } else if (request.toggleFullScreen) {
            toggleFullScreen();
        }
    });

    /**
     * adds button to youtube player
     */
    function addButton() {
        chrome.storage.sync.get('settings', function (result) {
            const settings = result.settings || {};
            const showButton = settings.showButton ?? true;

            if (showButton && window.location.pathname.includes('/watch')) {
                if (
                    !document.querySelectorAll(".ytif-button").length
                    && document.querySelectorAll(".ytp-right-controls").length
                ) {
                    let button = document.createElement("button");
                    button.classList = "ytp-button ytif-button";
                    button.title = "Inline Fullscreen";

                    let icon = document.createElement("i");
                    icon.classList = "ytif-fullscreen-button";
                    button.appendChild(icon);

                    document.querySelector(".ytp-right-controls").prepend(button);
                    button.addEventListener("mouseup", toggleFullScreen);
                }
            }
        });
    }

    /**
     * remove button from player
     */
    function removeButton() {
        const button = document.querySelector('.ytif-button');
        if (button) button.remove();
    }

    /**
     * listen to keyboard shortcuts
     */
    function shortcutListener(event) {
        if (
            event.target.tagName != 'INPUT'
            && event.target.tagName != 'TEXTAREA'
            && event.target.contentEditable != 'true'
        ) {
            switch (event.key) {
                case 'w':
                    toggleFullScreen();
                    break;
                case 'd':
                    // so that using 'd' doesn't toggle YT deafult caption settings
                    toggleFullScreen();
                    break;
                case 't':
                    // disable theater mode shortcut when fullscreen is active
                    if (isFullscreen()) {
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                    break;
            }
        }
    }

    /**
     * toggles fullscreen -> adds class to document and switches player mode if needed
     */
    function toggleFullScreen(e) {

        if (!isTransitioning) {

            isTransitioning = true;

            // toggle class
            document.documentElement.classList.toggle("ytif-fullscreen");

            // entering fullscreen
            if (isFullscreen()) {

                // theater mode needs to be on, 
                // but we'll restore the users preference when leaving fullscreen
                userPreferredView = getPlayerMode();

                // just in case another tab is being opened, save the theater mode preference to retrieve later
                chrome.storage.sync.get('userPreferredView', function (result) {
                    if (!result.userPreferredView) {
                        chrome.storage.sync.set({ userPreferredView: userPreferredView });
                    } else {
                        userPreferredView = result.userPreferredView;
                    }
                });

                if (getPlayerMode() === "default") {
                    toggleTheaterView();
                }

                // start hiding masthead
                enableMastheadAutoHide();

            } else {
                // leaving fullscreen

                // stop hiding masthead
                disableMastheadAutoHide();

                // don't toggle theater mode when not on /watch page
                if (window.location.pathname.includes('/watch')) {
                    // if we just left fullscreen and user doesn't use theater mode, turn it off
                    if (getPlayerMode() != userPreferredView) {
                        toggleTheaterView();
                    }

                    // since we exited fs mode, clear the preferred view form storage
                    chrome.storage.sync.set({ userPreferredView: null });
                }
            }

            // trigger window resize to recalculate player width (important for progress bar)
            window.dispatchEvent(new Event("resize"));

            // scroll to top
            window.scrollTo(0, 0);

            setTimeout(() => {
                isTransitioning = false;
            }, 100);
        }
    }

    /**
     * toggles theater mode by triggering a click event on the theater button
     */
    function toggleTheaterView() {
        document.querySelector(".ytp-size-button.ytp-button").dispatchEvent(new Event("click"));
    }

    /**
     * checks which player mode is active
     * @return {string}
     */
    function getPlayerMode() {
        if (document.querySelector('ytd-watch-flexy').attributes.theater) {
            return "theater";
        } else {
            return "default";
        }
    }

    /**
     * checks if fullsreen mode is active
     * @returns {boolean}
     */
    function isFullscreen() {
        return document.documentElement.classList.contains("ytif-fullscreen");
    }

    /**
     * exits fullscreen if navigating away from videoplayer
     */
    function exitFullscreenOnNavigation() {
        if (
            !window.location.pathname.includes('/watch')
            && isFullscreen()
        ) {
            toggleFullScreen();
        }
    }

})(chrome);
