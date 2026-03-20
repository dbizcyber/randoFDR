/* ============================================================
   sw.js — Service Worker randoFDR v5
   Stratégie Network First pour HTML et JS (toujours à jour)
   Stratégie Cache First pour CSS et images (statiques)
   ============================================================ */
const CACHE_NAME = 'randofdr-v5';

const CACHE_STATIC = [
  '/randoFDR/',
  '/randoFDR/index.html',
  '/randoFDR/carteRandos.html',
  '/randoFDR/css/style.css',
  '/randoFDR/css/carteRandos.css',
  '/randoFDR/js/app.js',
  '/randoFDR/js/meteoRando.js',
  '/randoFDR/js/carteParking.js',
  '/randoFDR/js/covoiturage.js',
  '/randoFDR/js/horairesRando.js',
  '/randoFDR/js/menuRandos.js',
  '/randoFDR/js/menuAnimateurs.js',
  '/randoFDR/js/menuParkings.js',
  '/randoFDR/js/rechercheRandos.js',
  '/randoFDR/js/gpxAnalyse.js',
  '/randoFDR/js/profilAltitude.js',
  '/randoFDR/js/resumeRando.js',
  '/randoFDR/js/envoiRando.js',
  '/randoFDR/js/formManager.js',
  '/randoFDR/js/gpxManuel.js',
  '/randoFDR/js/carteRandos.js',
  '/randoFDR/data/randos.js',
  '/randoFDR/data/animateurs.js',
  '/randoFDR/data/parkings.js',
  '/randoFDR/data/randosCoords.js',
  '/randoFDR/manifest.json',
];

/* ── INSTALLATION ── */
self.addEventListener('install', event => {
  console.log('[SW v5] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_STATIC))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATION : purge anciens caches ── */
self.addEventListener('activate', event => {
  console.log('[SW v5] Activation...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW v5] Suppression ancien cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* APIs externes → réseau uniquement, pas de cache */
  const apiDomains = [
    'api.open-meteo.com',
    'tile.openstreetmap.org',
    'tile.thunderforest.com',
    'tile.waymarkedtrails.org',
    'nominatim.openstreetmap.org',
    'router.project-osrm.org',
    'ibp-proxy.vercel.app',
    'supabase.co',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];
  if (apiDomains.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  const dest = event.request.destination;

  /* HTML et JS → Network First
     Toujours tenter le réseau d'abord pour avoir la version la plus récente.
     Si hors ligne, fallback sur le cache. */
  if (dest === 'document' || dest === 'script') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cached => cached || caches.match('/randoFDR/index.html'));
        })
    );
    return;
  }

  /* CSS, images, icônes → Cache First (rarement modifiés) */
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          });
      })
  );
});
