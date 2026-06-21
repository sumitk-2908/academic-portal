/// <reference lib="webworker" />

// Cast `self` to the correct Service Worker type to resolve TS errors
const sw = self as unknown as ServiceWorkerGlobalScope;

const PDF_CACHE_NAME = 'offline-pdf-cache-v1';

sw.addEventListener('message', async (event: ExtendableMessageEvent) => {
  if (!event.data) return;

  if (event.data.type === 'CACHE_PDF') {
    try {
      const cache = await caches.open(PDF_CACHE_NAME);
      const response = await fetch(event.data.url);
      if (response.ok) {
        await cache.put(event.data.url, response.clone());
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (err: any) {
      console.error("Failed to cache PDF:", err);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false, error: err.message });
      }
    }
  }

  if (event.data.type === 'REMOVE_PDF') {
    try {
      const cache = await caches.open(PDF_CACHE_NAME);
      await cache.delete(event.data.url);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    } catch (err) {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false });
      }
    }
  }
});

sw.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.includes('/storage/v1/object/public/') && url.pathname.endsWith('.pdf')) {
    event.respondWith(
      caches.open(PDF_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request);
        });
      })
    );
  }
});

// Adding an empty export ensures TypeScript treats this file as a module 
// and stops it from conflicting with standard DOM typings.
export {};