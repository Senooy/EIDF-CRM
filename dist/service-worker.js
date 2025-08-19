const CACHE_NAME = 'eidf-crm-cache-v1.8'; // Incremented version
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add paths to other static assets like images, CSS files, etc.
  // '/logo192.png',
  // '/logo512.png',
  // Note: For assets managed by Vite (like those in src/assets or automatically hashed files),
  // Vite's PWA plugin (if used) would typically handle their caching.
  // If not using a PWA plugin, you might need to manually list important static assets.
];

// Install a service worker
self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Cache and return requests - CORRECTED
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache hit - return response
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request.clone()).then((response) => { // It's good practice to clone the request for fetch
        // Check if we received a valid response and if it's a GET request.
        // We only want to cache valid GET requests.
        if (
          !response ||
          response.status !== 200 ||
          event.request.method !== 'GET'
        ) {
          return response; // Return non-cacheable responses directly
        }

        // Clone the response because it's a stream and can only be consumed once
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(error => {
        console.error('Service Worker: Fetch failed for:', event.request.url, error);
        // It's important to rethrow the error so the browser knows the fetch failed.
        throw error;
      });
    })
  );
});

// Update a service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 