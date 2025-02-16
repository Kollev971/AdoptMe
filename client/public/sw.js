const CACHE_NAME = 'adoptme-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// Fetch Event Strategy: Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Skip for non-GET requests and browser-sync
  if (event.request.method !== 'GET' || event.request.url.includes('browser-sync')) {
    return;
  }

  // Handle image requests with cache-first strategy
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request)
            .then((fetchResponse) => {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              return fetchResponse;
            });
        })
    );
    return;
  }

  // Network first strategy for other requests
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background Sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncPendingRequests') {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  try {
    const pendingRequests = await getPendingRequests();
    await Promise.all(pendingRequests.map(request => {
      return fetch(request);
    }));
  } catch (error) {
    console.error('Error syncing pending requests:', error);
  }
}
