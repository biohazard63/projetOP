// Cache only this explicit public allowlist. Never cache APIs or user pages.
const CACHE = 'mugiwara-public-v2-1';
const PUBLIC_FILES = ['/offline.html', '/images/icons/icon-192.png', '/images/icons/icon-512.png', '/images/icons/maskable-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_FILES)));
  // Updates wait for explicit user action; no automatic reload during openings.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('mugiwara-public-') && name !== CACHE).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'MUGIWARA_SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PUBLIC_FILES.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await (await caches.open(CACHE)).match('/offline.html')) || new Response('Connexion indisponible', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
  }
  // All other requests, including sessions, receipts, lists and cards: network only.
});
