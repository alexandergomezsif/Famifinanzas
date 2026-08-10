// =============================================
// FAMIFINANZAS - SERVICE WORKER (PWA)
// =============================================
const CACHE_NAME = 'famifinanzas-v3.5.0';
const ASSETS = [
  '/Famifinanzas/',
  '/Famifinanzas/index.html',
  '/Famifinanzas/css/style.css',
  '/Famifinanzas/js/app.js',
  '/Famifinanzas/logofamiliaicono.png',
  '/Famifinanzas/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Instalar y cachear recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Servir desde cache, con fallback a red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
