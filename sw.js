// Dertli Bot — service worker minimal (vetëm cache i shell-it statik).
var CACHE = "dertli-v3";
var ASSETS = ["./", "index.html", "style.css", "app.js", "config.js", "logo.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  // API + admin: gjithmonë rrjet (kurrë cache).
  if (u.pathname.indexOf("/.netlify/functions/") === 0 || u.pathname.indexOf("admin.html") !== -1) return;
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
