(function (chrome) {

    // holds user preference of theater or normal mode
    let userPreferredView;

    // isTransitioning: if true, we're in the process of entering or leaving fullscreen
    let isTransitioning = false;

    // add fullscreen button
    document.body.addEventListener('yt-navigate-finish', addButton);
    document.body.addEventListener('yt-navigate-finish', exitFullscreenOnNavigation);
    window.addEventListener('load', addButton);
    addButton();
    document.body.addEventListener('keydown', shortcutListener);

    /**
     * Automatically enable fullscreen mode
     */
    document.body.addEventListener('yt-navigate-finish', autoEnableFullscreen);
    function autoEnableFullscreen() {
        chrome.storage.sync.get('settings', function (result) {
            const settings = result.settings || {};  // Default to an empty object if not set
            const autoEnable = settings.autoEnable || false;  // Default to false if autoEnable is not set

            if (autoEnable && window.location.pathname.includes('/watch')) {
                if (!document.documentElement.classList.contains("ytif-fullscreen")) {
                    toggleFullScreen();
                }
            }
        });
    }

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

    /**
     * listen to keyboard shortcut (w)
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
                case 't':
                    // disable theater mode shortcut when fullscreen is active
                    if (document.documentElement.classList.contains("ytif-fullscreen")) {
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
            if (document.documentElement.classList.contains("ytif-fullscreen")) {

                // theater mode needs to be on, 
                // but we'll restore the users preference when leaving fullscreen
                userPreferredView = getPlayerMode();

                if (getPlayerMode() === "default") {
                    toggleTheaterView();
                }

                // start hiding masthead
                enableMastheadAutoHide();

            } else {
                // leaving fullscreen

                // stop hiding masthead
                disableMastheadAutoHide();

                // if we just left fullscreen and user doesn't use theater mode, turn it off
                if (getPlayerMode() != userPreferredView) {
                    toggleTheaterView();
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
     * toggles theater mode. triggers click event on the theater button
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
     * exits fullscreen if navigating away from videoplayer
     */
    function exitFullscreenOnNavigation() {
        if (
            !window.location.pathname.includes('/watch')
            && document.documentElement.classList.contains("ytif-fullscreen")
        ) {
            toggleFullScreen();
        }
    }

})(chrome);
