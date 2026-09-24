const CACHE_NAME = 'remisiones-app-v1';

const ASSETS = [
  './',
  './index.html',
  './app.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/licencia.js',
  './manifest.json',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
  // ¡Ojo! Retiramos los CDNs de aquí para evitar que fallen en la instalación.
];

// Instalar el Service Worker y guardar recursos locales en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones para que funcione Offline (esto también cacheará los CDNs sobre la marcha)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Opcional: puedes clonar y guardar dinámicamente peticiones exitosas aquí si lo deseas
        return response;
      });
    })
  );
});
