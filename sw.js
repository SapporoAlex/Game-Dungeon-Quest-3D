// Offline support. Static files are served from cache and refreshed in the background
// (stale-while-revalidate), so uploading a new version to GitHub Pages is picked up on the next visit.
// Audio files are passed straight through (browsers stream them with Range requests).
const CACHE = "dungeon-quest-3d-v2";
const PRECACHE = [
  "index.html",
  "js/audio-config.js",
  "js/engine.js",
  "js/game.js",
  "js/hud.js",
  "js/levels.js",
  "js/levels-base.js",
  "js/levelgen.js",
  "js/dialogue.js",
  "js/models-extra.js",
  "js/thumbs.js",
  "js/main.js",
  "js/shop.js",
  "js/state.js",
  "manifest.webmanifest",
  "models/arrow.glb",
  "models/banner.glb",
  "models/barrel.glb",
  "models/chaos.glb",
  "models/chest.glb",
  "models/coin.glb",
  "models/counter.glb",
  "models/crate.glb",
  "models/door.glb",
  "models/dragon.glb",
  "models/elf.glb",
  "models/goblin.glb",
  "models/plate.glb",
  "models/potion_attack.glb",
  "models/potion_health.glb",
  "models/potion_mana.glb",
  "models/potion_maxhealth.glb",
  "models/potion_search.glb",
  "models/potion_speed.glb",
  "models/shelf.glb",
  "models/skeleton.glb",
  "models/stairs.glb",
  "models/sword.glb",
  "models/table.glb",
  "models/torch.glb",
  "vendor/GLTFLoader.js",
  "vendor/three.module.js",
  "vendor/utils/BufferGeometryUtils.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const host = new URL(req.url).hostname;
  const isFont = host === "fonts.googleapis.com" || host === "fonts.gstatic.com";           // web fonts: cached after first load, so menus keep their look offline
  if (req.method !== "GET" || !(req.url.startsWith(self.location.origin) || isFont)) return;
  if (/\.(mp3|ogg|wav|m4a)$/i.test(new URL(req.url).pathname) || req.headers.has("range")) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net || (req.mode === "navigate" ? cache.match("./index.html") : undefined);
  }));
});
