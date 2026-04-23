const CACHE_NAME = 'hd-nailed-it-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/hdnailedit-icon.jpeg',
  './assets/js/state.js',
  './assets/js/sync.js',
  './assets/js/navigation.js',
  './assets/js/form.js',
  './assets/js/entries.js',
  './assets/js/views.js',
  './assets/js/export.js',
  './assets/js/import.js',
  './assets/js/app.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
