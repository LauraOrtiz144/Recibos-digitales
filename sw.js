const CACHE_NAME = 'remisiones-app-v1';

const ASSETS = [
  './',
  './index.html',
  './app.html',           // Lo agregué porque está en tu árbol
  './css/style.css',      // Ruta correcta según tu árbol
  './js/app.js',          // Ruta correcta según tu árbol
  './js/db.js',           // Ruta correcta según tu árbol
  './js/licencia.js',     // Ruta correcta según tu árbol
  './manifest.json',
  './icons/icon-192.png', // Para que el ícono funcione sin internet
  './icons/icon-512.png', // Para que el ícono funcione sin internet
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Instalar el Service Worker y guardar recursos en caché
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

// Interceptar peticiones para que funcione Offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});