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
     * listen to messages from background script
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
                case 's':
                    if (document.documentElement.classList.contains("ytif-fullscreen")) {
                        toggleSearchbar();
                    }
                    break;
            }
            if (event.key == 't') {
                console.log('trigger');
                if (document.documentElement.classList.contains("ytif-fullscreen")) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }
            }
        }
    }

    function toggleSearchbar() {
        document.documentElement.classList.toggle("ytif-masthead-hidden");
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

                // hide masthead
                toggleSearchbar();
            } else {
                // leaving fullscreen
            
                // if the masthead is hidden, make it appear again
                if (document.documentElement.classList.contains("ytif-masthead-hidden")) {
                    toggleSearchbar();
                }

                // if we just left fullscreen and user doesn't use theater mode, turn it off
                if (getPlayerMode() != userPreferredView) {
                    toggleTheaterView();
                }
            }

            // trigger window resize to recalculate player width (important for progress bar)
            window.dispatchEvent(new Event("resize"));

            // scroll to top
            window.scrollTo(0,0);

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
        /*if (document.querySelector('.ytd-page-manager').attributes.theater) {
            return "theater";
        } else {
            return "default";
        }*/
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
