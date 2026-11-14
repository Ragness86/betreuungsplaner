// Service Worker: erst Netz (immer aktuelle Version), bei fehlender Verbindung die zuletzt gespeicherte Seite.
const CACHE = 'betreuungsplaner-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));

// Push-Nachrichten (vom Server als reine Daten gesendet: titel, text, url)
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data?.json() ?? {}; } catch { p = {}; }
  const d = p.data ?? p.notification ?? p;
  e.waitUntil(self.registration.showNotification(d.titel ?? d.title ?? 'Betreuungsplaner Lotte', {
    body: d.text ?? d.body ?? '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: d.url ?? './' },
    tag: 'betreuungsplaner',
    renotify: true,
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fs) => {
    const f = fs.find((c) => c.url.startsWith(self.registration.scope));
    return f ? f.focus() : self.clients.openWindow(url);
  }));
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  const eigene = u.origin === location.origin;
  const sdk = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');
  if (e.request.method !== 'GET' || !(eigene || sdk)) return; // Firestore/Anmeldung laufen am Worker vorbei
  e.respondWith(
    fetch(e.request, eigene ? { cache: 'no-cache' } : undefined).then((r) => {
      if (r.ok) { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); }
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./'))),
  );
});
