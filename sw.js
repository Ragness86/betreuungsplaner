// Service Worker: erst Netz (immer aktuelle Version), bei fehlender Verbindung die zuletzt gespeicherte Seite.
const CACHE = 'betreuungsplaner-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  const eigene = u.origin === location.origin;
  const sdk = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');
  if (e.request.method !== 'GET' || !(eigene || sdk)) return; // Firestore/Anmeldung laufen am Worker vorbei
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); }
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./'))),
  );
});
