// Service worker mínimo, escrito à mão (sem next-pwa/serwist — evita
// risco de incompatibilidade com Next 16 + Turbopack, muito recente).
// Objetivo único: satisfazer o critério de instalabilidade do PWA e dar
// um cache básico network-first pro Portal do Bombeiro, não offline
// completo. Decisão registrada em docs/decisoes-tecnicas.md.

const CACHE_NAME = "bc-portal-v1";
const ESCOPO = ["/portal", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const dentroDoEscopo = ESCOPO.some((prefixo) => url.pathname === prefixo || url.pathname.startsWith(`${prefixo}/`));
  if (!dentroDoEscopo) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copia = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
