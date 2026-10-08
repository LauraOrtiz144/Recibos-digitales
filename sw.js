const CACHE = 'remisiones-v4';
const LOCALES = ['./', './index.html', './css/style.css', './js/app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/FORTIZ.jpeg'];
const EXTERNOS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
];
const HOSTS_EXTERNOS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    ...LOCALES.map(a => c.add(a).catch(() => {})),
    ...EXTERNOS.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {}))
  ])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
  self.clients.claim();
});

function conTiempo(promesa, ms) {
  return new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error('timeout')), ms);
    promesa.then(r => { clearTimeout(t); ok(r); }, er => { clearTimeout(t); no(er); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  // Archivos propios: red primero (siempre la última versión); con señal mala o sin red, la copia guardada.
  if (u.origin === location.origin) {
    e.respondWith(
      conTiempo(fetch(req, { cache: 'no-cache' }), 4000)
        .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  // Librería de PDF y fuentes: copia guardada primero. Lo demás (Google Sheets) nunca se toca.
  if (HOSTS_EXTERNOS.includes(u.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; }))
    );
  }
});
