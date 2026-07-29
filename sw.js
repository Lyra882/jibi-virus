/* 击毙病毒 - 离线缓存
 * 首次访问后把图片/页面存进手机，之后打开秒开、不重复下载。
 * 部署更新时改下面 CACHE 的版本号（如 JIBI-V1→V2）即可强制刷新缓存。
 */
const CACHE = 'JIBI-V1';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 字体等跨域资源交给浏览器默认处理

  // 页面本身：优先网络拿最新，离线再退回缓存
  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isDoc) {
    e.respondWith(
      fetch(req).then(function (res) {
        caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // 图片等素材：缓存优先，秒开；后台顺手更新
  e.respondWith((async function () {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(function (res) {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(function () { return cached; });
    return cached || network;
  })());
});
