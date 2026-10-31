// Only the application shell is cached here. Business data and the outbox are
// stored per account in IndexedDB, never in a shared HTTP cache.
const CACHE = 'cond-shell-__BUILD__';
const ASSETS = __ASSETS__;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('cond-shell-') && k !== CACHE).slice(0,-1).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
    if (event.request.mode === 'navigate') {
        if (url.pathname.startsWith('/legacy')) return;
        // Previous caches retain hashed chunks for already-open tabs. Never
        // take their old index.html when opening the current app offline.
        event.respondWith(fetch(event.request).catch(async () => {
            const current = await caches.open(CACHE);
            return await current.match(url.pathname) || await current.match('/index.html');
        })); return;
    }
    event.respondWith(caches.open(CACHE).then(current => current.match(event.request)).then(hit => hit || caches.match(event.request)).then(hit => hit || fetch(event.request)));
});
