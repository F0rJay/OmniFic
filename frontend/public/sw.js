// Modified by OmniFic contributors from OpenFic v0.7.5.
importScripts("/sw-precache.js");

const CACHE_NAME = "omnific-shell-v2";
const APP_SHELL_CACHE_PREFIXES = ["openfic-shell-", "omnific-shell-"];

const BACKEND_PATHS = ["/api/", "/socket.io/", "/covers/", "/icons/"];

self.addEventListener("install", (event) => {
  const precacheList = self.__PRECACHE_LIST || [];
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(precacheList))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                APP_SHELL_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
                key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isBackendRequest(url) {
  return BACKEND_PATHS.some((p) => url.pathname.startsWith(p));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isBackendRequest(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.open(CACHE_NAME).then((cache) => cache.match("/index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        });
      }),
    ),
  );
});
