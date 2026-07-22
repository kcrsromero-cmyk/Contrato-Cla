const CACHE_NAME = 'contrato-claro-cache-v2';
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.webmanifest'
];

// 1. INSTALL EVENT: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core app shell...');
      return cache.addAll(PRE_CACHE_ASSETS);
    }).then(() => {
      // Force immediate activation
      return self.skipWaiting();
    })
  );
});

// 2. ACTIVATE EVENT: Clear outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Claim clients immediately
      return self.clients.claim();
    })
  );
});

// 3. FETCH EVENT: Intercept requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests or browser extension/live-reload connections
  if (event.request.method !== 'GET' || 
      requestUrl.protocol === 'chrome-extension:' ||
      requestUrl.hostname.includes('localhost') && requestUrl.port === '35729' ||
      event.request.url.includes('ws://') || 
      event.request.url.includes('socket.io') ||
      event.request.url.includes('__vite_ping')) {
    return;
  }

  // Handle same-origin assets (JS, CSS, HTML, SVG)
  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately and update cache in background (Stale-While-Revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {
            // Silently ignore background fetch failure if offline
          });
          return cachedResponse;
        }

        // Cache-miss: Fetch from network and save to cache
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Offline fallback
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
    );
  } else {
    // External requests (Google Fonts, etc.)
    // Stale-While-Revalidate for style sheets and fonts, otherwise network-only (including Socrata API)
    if (requestUrl.hostname.includes('fonts.googleapis.com') || requestUrl.hostname.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            });
            return cachedResponse;
          }

          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          });
        })
      );
    } else if (requestUrl.hostname.includes('datos.gov.co')) {
      // Network-first for Socrata Open Data API
      event.respondWith(
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
      );
    } else {
      // Direct network for everything else
      return;
    }
  }
});
