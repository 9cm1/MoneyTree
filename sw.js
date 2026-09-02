const CACHE_NAME = 'money-tree-app-v1';
const APP_SHELL = [
    './',
    './index.html',
    './dashboard.html',
    './apply.html',
    './order.html',
    './repay.html',
    './profile.html',
    './admin.html',
    './key-facts.html',
    './loan-contract.html',
    './repayment-plan.html',
    './user-care.html',
    './style.css',
    './config.js',
    './loan-utils.js',
    './pwa.js',
    './manifest.webmanifest',
    './assets/money-tree-logo.jpg',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith('money-tree-app-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const requestUrl = new URL(request.url);

    if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    return (await caches.match(request)) || caches.match('./index.html');
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const freshResponse = fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cachedResponse || new Response('Money Tree is offline. Please reconnect and try again.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }));

            return cachedResponse || freshResponse;
        })
    );
});
