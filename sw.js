// 오프라인 지원: 앱 파일은 네트워크 우선, 실패하면 캐시 (AI 요청 등 외부 요청은 건드리지 않음)
const CACHE = 'my-care-v3';
const ASSETS = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './data/foods.js', './data/recipes.js', './data/recipes-more.js', './data/food-art.js',
  './js/store.js', './js/ai.js', './js/ui.js', './js/diet.js', './js/kitchen.js', './js/planner.js', './js/app.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
