(function () {
    'use strict';

    const DISMISSED_KEY = 'moneytree-install-dismissed';
    const INSTALLED_KEY = 'moneytree-app-installed';
    let deferredInstallPrompt = null;
    let promptElement = null;

    function storageGet(storage, key) {
        try {
            return storage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function storageSet(storage, key, value) {
        try {
            storage.setItem(key, value);
        } catch (error) {
            // Installation must still work when browser storage is unavailable.
        }
    }

    function isRunningAsInstalledApp() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
    }

    function isIosDevice() {
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    }

    function promptCopy() {
        if (deferredInstallPrompt) {
            return {
                message: 'Install the Money Tree app for quicker access from your home screen.',
                button: 'Install app'
            };
        }

        if (isIosDevice()) {
            return {
                message: 'Install Money Tree: tap Share, then choose Add to Home Screen.',
                button: 'Got it'
            };
        }

        return {
            message: 'Install Money Tree from your browser menu by choosing Install app or Add to Home screen.',
            button: 'Got it'
        };
    }

    function updatePromptCopy() {
        if (!promptElement) return;
        const copy = promptCopy();
        promptElement.querySelector('[data-install-message]').textContent = copy.message;
        promptElement.querySelector('[data-install-action]').textContent = copy.button;
    }

    function hidePrompt(rememberForSession) {
        if (!promptElement) return;
        promptElement.classList.remove('is-visible');
        if (rememberForSession) {
            storageSet(window.sessionStorage, DISMISSED_KEY, '1');
        }
        window.setTimeout(() => {
            if (promptElement) promptElement.hidden = true;
        }, 220);
    }

    function createPrompt() {
        if (promptElement || isRunningAsInstalledApp()) return;

        const container = document.createElement('aside');
        container.id = 'installAppPrompt';
        container.className = 'install-prompt';
        if (document.querySelector('.bottom-nav')) {
            container.classList.add('install-prompt-above-nav');
        }
        container.hidden = true;
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-labelledby', 'installAppTitle');
        container.setAttribute('aria-describedby', 'installAppMessage');
        container.innerHTML = `
            <img class="install-prompt-icon" src="assets/icons/icon-192.png" alt="" width="52" height="52" />
            <div class="install-prompt-content">
                <strong id="installAppTitle">Install Money Tree</strong>
                <p id="installAppMessage" data-install-message></p>
                <div class="install-prompt-actions">
                    <button class="install-action" type="button" data-install-action>Install app</button>
                    <button class="install-dismiss" type="button" data-install-dismiss>Not now</button>
                </div>
            </div>
        `;

        container.querySelector('[data-install-dismiss]').addEventListener('click', () => {
            hidePrompt(true);
        });

        container.querySelector('[data-install-action]').addEventListener('click', async () => {
            if (!deferredInstallPrompt) {
                hidePrompt(true);
                return;
            }

            const activePrompt = deferredInstallPrompt;
            deferredInstallPrompt = null;
            activePrompt.prompt();
            const choice = await activePrompt.userChoice;

            if (choice.outcome === 'accepted') {
                storageSet(window.localStorage, INSTALLED_KEY, '1');
                hidePrompt(false);
            } else {
                hidePrompt(true);
            }
        });

        document.body.appendChild(container);
        promptElement = container;
        updatePromptCopy();
    }

    function showPrompt() {
        if (isRunningAsInstalledApp()) return;
        if (storageGet(window.sessionStorage, DISMISSED_KEY) === '1') return;
        if (storageGet(window.localStorage, INSTALLED_KEY) === '1' && !deferredInstallPrompt) return;

        createPrompt();
        if (!promptElement) return;
        updatePromptCopy();
        promptElement.hidden = false;
        window.requestAnimationFrame(() => promptElement.classList.add('is-visible'));
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        try {
            window.localStorage.removeItem(INSTALLED_KEY);
        } catch (error) {
            // Ignore storage restrictions.
        }
        showPrompt();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        storageSet(window.localStorage, INSTALLED_KEY, '1');
        hidePrompt(false);
    });

    if ('serviceWorker' in navigator &&
        (window.location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(window.location.hostname))) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
                console.warn('Money Tree app installation is temporarily unavailable.', error);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.setTimeout(showPrompt, 900), { once: true });
    } else {
        window.setTimeout(showPrompt, 900);
    }
})();
