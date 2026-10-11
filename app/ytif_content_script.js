(function (browserAPI) {
  // holds user preference of theater or normal mode
  let userPreferredView;

  // isTransitioning: if true, we're in the process of entering or leaving fullscreen
  let isTransitioning = false;

  // holds the settings object
  let globalSettings;

  // get settings
  browserAPI.storage.sync.get('settings', function (result) {
    globalSettings = result.settings;
  });

  // yt-navigate-finish fires on page load and also when navigating without a page reload
  // note: fires a little too early so that some functionality is not available yet.
  document.body.addEventListener('yt-navigate-finish', () => {
    // exit fullscreen if navigating away from a video
    exitFullscreenOnNavigation();

    // add fullscreen after navigation
    addButton();

    // rebind player listeners when fullscreen remains active after navigation
    if (isFullscreen()) {
      refreshPlayerBinding();
    }
  });

  // yt-player-updated triggers when the player is ready.
  // mostly needed because the theater mode toggle is not ready before so things like autoEnable need to go here.
  document.addEventListener('yt-player-updated', () => {
    // add fullscreen button
    addButton();

    // rebind player listeners when the player is replaced while fullscreen is active
    if (isFullscreen()) {
      refreshPlayerBinding();
    }

    // Automatically enable fullscreen mode
    browserAPI.storage.sync.get('settings', function (result) {
      const settings = result.settings || {}; // Default to an empty object if not set
      const autoEnable = settings.autoEnable || false; // Default to false if autoEnable is not set

      if (window.location.pathname.includes('/watch')) {
        // keep the global settings in sync in case they haven't loaded yet
        globalSettings = { ...globalSettings, ...settings };

        // handle auto enable
        if (autoEnable) {
          autoEnableFullScreen();
        }

        // if auto enable is off, check if we need to restore the theater mode toggle
        // otherwise store preference in local variable
        browserAPI.storage.sync.get('userPreferredView', function (result) {
          if (!autoEnable) {
            if (!isFullscreen()) {
              if (result.userPreferredView && getPlayerMode() != result.userPreferredView) {
                toggleTheaterView();
              }
              browserAPI.storage.sync.set({ userPreferredView: null });
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
  browserAPI.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings) {
      const { oldValue = {}, newValue = {} } = changes.settings;

      // update global settings object
      globalSettings = { ...globalSettings, ...changes.settings.newValue };

      if (oldValue.showButton !== newValue.showButton) {
        if (newValue.showButton) {
          addButton();
        } else {
          removeButton();
        }
      }

      if (oldValue.autoEnable !== newValue.autoEnable) {
        if (newValue.autoEnable) {
          // only enter fullscreen on a ready watch page
          autoEnableFullScreen();
        } else if (isFullscreen()) {
          // exit the active session, deferring if a transition is in progress
          // so the exit is not dropped
          if (isTransitioning) {
            setTimeout(() => {
              if (isFullscreen() && !globalSettings?.autoEnable) {
                toggleFullScreen();
              }
            }, 150);
          } else {
            toggleFullScreen();
          }
        }
      }

      // update player button tooltip on shortcut change
      updatePlayerButtonTooltip();
    }
  });

  /**
   * tooltip text for the player button,
   * omitting the shortcut when it is disabled
   */
  function buttonTooltipText(label) {
    return globalSettings.fullscreenShortcut
      ? label + ' (' + globalSettings.fullscreenShortcut + ')'
      : label;
  }

  function updatePlayerButtonTooltip() {
    const btn = document.querySelector('.ytif-button');
    if (btn) {
      btn.setAttribute('data-tooltip', buttonTooltipText('Windowed Fullscreen'));
      btn.setAttribute('data-tooltip-active', buttonTooltipText('Exit Windowed Fullscreen'));
    }
  }

  /**
   * reflect the current fullscreen state as the player button's toggle state
   */
  function updatePlayerButtonState() {
    const btn = document.querySelector('.ytif-button');
    if (btn) {
      btn.setAttribute('aria-pressed', String(isFullscreen()));
    }
  }

  /**
   * Searchbar / Masthead autohide logic
   */
  let inactivityTimeout;
  let playerObject = null;

  /**
   * (re)bind the play/pause listeners to the current video element,
   * dropping the listeners that were attached to a previous player
   */
  function refreshPlayerBinding() {
    const stream = document.querySelector('.video-stream');

    // nothing to bind (the new player is not in the DOM yet):
    // drop the old binding and reset the autohide state
    if (!stream) {
      detachPlayerListeners();
      playerObject = null;
      clearTimeout(inactivityTimeout);
      showMasthead();
      return;
    }

    // the player did not change, nothing to rebind
    if (playerObject === stream) {
      return;
    }

    // the player was replaced: drop the old binding and reset the autohide state
    detachPlayerListeners();
    playerObject = stream;
    clearTimeout(inactivityTimeout);
    showMasthead();

    playerObject.addEventListener('play', handleMastheadPlay);
    playerObject.addEventListener('pause', handleMastheadPause);

    // a freshly bound player is usually playing, so start the autohide timer
    if (!stream.paused) {
      startInactivityTimer();
    }
  }

  function detachPlayerListeners() {
    if (!playerObject) return;
    playerObject.removeEventListener('play', handleMastheadPlay);
    playerObject.removeEventListener('pause', handleMastheadPause);
  }

  function enableMastheadAutoHide() {
    refreshPlayerBinding();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    if (!isPlayerPaused()) {
      startInactivityTimer();
    }
  }

  function disableMastheadAutoHide() {
    clearTimeout(inactivityTimeout);

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);

    detachPlayerListeners();
    playerObject = null;
    showMasthead();
  }

  function getMasthead() {
    return document.getElementById('masthead');
  }

  function isPlayerPaused() {
    return document.querySelector('.video-stream')?.paused ?? null;
  }

  function handleMastheadPause() {
    if (isSeekbarVisible()) {
      showMasthead();
      startInactivityTimer();
    }
  }

  function isSeekbarVisible() {
    const seekbar = document.querySelector('.ytp-chrome-bottom');
    return seekbar ? window.getComputedStyle(seekbar).opacity > 0 : false;
  }

  function handleMastheadPlay() {
    if (isSeekbarVisible()) {
      showMasthead();
    }
    startInactivityTimer();
  }

  function showMasthead() {
    getMasthead()?.classList.remove('ytif-masthead-hidden');
  }

  function hideMasthead() {
    // check if searchbar is in focus, otherwise hide masthead
    if (isMastheadFocused()) {
      startInactivityTimer();
    } else {
      getMasthead()?.classList.add('ytif-masthead-hidden');
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
    if (isMastheadFocused()) {
      document.activeElement.blur();
    }
    hideMasthead();
  }

  function onFocusIn() {
    if (isMastheadFocused()) {
      clearTimeout(inactivityTimeout);
      showMasthead();
    }
  }

  function onFocusOut() {
    startInactivityTimer();
  }

  function isMastheadFocused() {
    return document.activeElement?.getAttribute('name') === 'search_query';
  }

  /**
   * listen to messages from settings script
   */
  browserAPI.runtime.onMessage.addListener(function (request, sender, callback) {
    if (request.checkInstalled) {
      callback({ installed: true });
    } else if (request.toggleFullScreen) {
      toggleFullScreen();
      callback({ toggled: true });
    }
  });

  /**
   * adds button to youtube player
   */
  function addButton() {
    browserAPI.storage.sync.get('settings', function (result) {
      const settings = result.settings || {};
      const showButton = settings.showButton ?? true;

      if (showButton && window.location.pathname.includes('/watch')) {
        if (
          !document.querySelectorAll('.ytif-button').length &&
          document.querySelectorAll('.ytp-right-controls').length
        ) {
          let button = document.createElement('button');
          button.classList = 'ytp-button ytif-button';
          button.title = 'Inline Fullscreen';
          button.setAttribute('aria-label', 'Toggle Fullscreen');

          button.setAttribute('data-tooltip', buttonTooltipText('Windowed Fullscreen'));
          button.setAttribute('data-tooltip-active', buttonTooltipText('Exit Windowed Fullscreen'));

          let icon = document.createElement('i');
          icon.classList = 'ytif-fullscreen-button';
          button.appendChild(icon);

          document.querySelector('.ytp-right-controls').prepend(button);
          updatePlayerButtonState();
          button.addEventListener('click', toggleFullScreen);
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
      event.target.tagName != 'INPUT' &&
      event.target.tagName != 'TEXTAREA' &&
      !event.target.isContentEditable &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      switch (event.key) {
        case globalSettings.fullscreenShortcut:
          // skip when the shortcut is disabled (empty value)
          if (globalSettings.fullscreenShortcut) {
            toggleFullScreen();
          }
          break;
        case 't':
          // exit fullscreen when pressed during inline fullscreen mode
          if (isFullscreen()) {
            event.preventDefault();
            event.stopImmediatePropagation();

            userPreferredView = userPreferredView === 'theater' ? 'default' : 'theater';
            browserAPI.storage.sync.set({ userPreferredView: userPreferredView });

            toggleFullScreen();
          }
          break;
        case 'Escape':
          if (isFullscreen()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleFullScreen();
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
      document.documentElement.classList.toggle('ytif-fullscreen');

      // reflect the new state on the player button
      updatePlayerButtonState();

      // entering fullscreen
      if (isFullscreen()) {
        // theater mode needs to be on,
        // but we'll restore the users preference when leaving fullscreen
        userPreferredView = getPlayerMode();

        // just in case another tab is being opened, save the theater mode preference to retrieve later
        browserAPI.storage.sync.get('userPreferredView', function (result) {
          if (!result.userPreferredView) {
            browserAPI.storage.sync.set({ userPreferredView: userPreferredView });
          } else {
            userPreferredView = result.userPreferredView;
          }
        });

        if (getPlayerMode() === 'default') {
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
          browserAPI.storage.sync.set({ userPreferredView: null });
        }
      }

      // trigger window resize to recalculate player width (important for progress bar)
      window.dispatchEvent(new Event('resize'));

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
    const button = document.querySelector('.ytp-size-button.ytp-button');
    if (button) {
      button.dispatchEvent(new Event('click'));
    }
  }

  /**
   * checks which player mode is active
   * @return {string}
   */
  function getPlayerMode() {
    const watchFlexy = document.querySelector('ytd-watch-flexy');
    if (watchFlexy && watchFlexy.attributes && watchFlexy.attributes.theater) {
      return 'theater';
    }
    return 'default';
  }

  /**
   * checks if fullsreen mode is active
   * @returns {boolean}
   */
  function isFullscreen() {
    return document.documentElement.classList.contains('ytif-fullscreen');
  }

  /**
   * checks whether the watch page has all elements
   * required to enter inline fullscreen
   */
  function isPlayerReady() {
    return (
      window.location.pathname === '/watch' &&
      document.querySelector('#full-bleed-container') !== null &&
      document.querySelector('.ytp-size-button.ytp-button') !== null &&
      document.querySelector('.video-stream') !== null
    );
  }

  /**
   * enters fullscreen automatically when the option is enabled
   * and the watch page player is fully ready
   * @param {boolean} canRetry - allow one retry if the layout is not ready yet
   */
  function autoEnableFullScreen(canRetry = true) {
    if (!globalSettings?.autoEnable || isFullscreen()) {
      return;
    }

    if (isPlayerReady()) {
      toggleFullScreen();
    } else if (canRetry) {
      // retry once after a short delay to allow YouTube's layout to render
      setTimeout(() => {
        autoEnableFullScreen(false);
      }, 100);
    }
  }

  /**
   * exits fullscreen if navigating away from videoplayer
   */
  function exitFullscreenOnNavigation() {
    if (!window.location.pathname.includes('/watch') && isFullscreen()) {
      toggleFullScreen();
    }
  }
})(globalThis.chrome ?? globalThis.browser);
