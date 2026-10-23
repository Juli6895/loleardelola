// Service worker de LoleardLola (la app instalable).
//
// A propósito hace muy poco:
// - Guarda los archivos de la app que nunca cambian (/_next/static/ y
//   los íconos llevan versión en el nombre), para que abra rápido.
// - Si no hay internet, muestra una página que lo dice en vez del
//   dinosaurio del navegador.
// - NUNCA guarda las páginas ni lo que responde /api: las búsquedas, el
//   clóset, los topes y los pagos siempre se leen frescos.
// - Muestra los avisos de rebaja (notificaciones push) y, al tocarlos,
//   abre la prenda en la tienda.
const VERSION = "v2";
const CACHE = `loleardlola-${VERSION}`;
const SIN_INTERNET = "/sin-internet.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(SIN_INTERNET)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(SIN_INTERNET)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/")) {
    event.respondWith(
      caches.match(req).then(
        (guardada) =>
          guardada ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let n = {};
  try {
    n = event.data ? event.data.json() : {};
  } catch {
    n = { cuerpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(n.titulo || "LoleardLola", {
      body: n.cuerpo || "",
      icon: "/iconos/icono-192.png",
      badge: "/iconos/icono-192.png",
      image: n.imagen || undefined,
      data: { url: n.url || "/" },
      lang: "es-CO",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
