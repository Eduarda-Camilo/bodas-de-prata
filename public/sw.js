// Cache only public static assets and the authorized HTML shell. Never API responses/photos/tokens.
const CACHE = "bodas-shell-v3";
const STATIC = [
  "/journey.svg",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.search
  )
    return;
  if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.headers.get("X-Trip-Shell") === "1") {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put("/", copy)),
            );
          }
          return response;
        })
        .catch(async () => {
          const saved = await caches.match("/");
          return (
            saved ||
            new Response(
              '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>Sem sinal</title><body style="font:18px Arial;padding:32px"><h1>A estrada está sem sinal.</h1><p>Abra a viagem quando a conexão voltar. Depois da primeira visita, o roteiro poderá ficar disponível neste celular.</p></body></html>',
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }),
    );
    return;
  }
  if (
    STATIC.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/")
  )
    event.respondWith(
      caches.match(event.request).then(
        (saved) =>
          saved ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches
                  .open(CACHE)
                  .then((cache) => cache.put(event.request, copy)),
              );
            }
            return response;
          }),
      ),
    );
});
