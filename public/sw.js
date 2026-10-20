/**
 * 用途：校园电脑管家 Service Worker，提供应用壳预缓存、离线导航和静态资源缓存。
 */
const CACHE_NAME = "campus-pc-care-v2";
const CORE_ASSETS = [
  "/",
  "/graph",
  "/diagnosis",
  "/checkup",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const PAGE_ASSETS = ["/", "/graph", "/diagnosis", "/checkup"];

async function cacheAsset(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (response.ok) await cache.put(url, response.clone());
  } catch {
    // 单个资源失败不应阻止 Service Worker 安装。
  }
}

async function cachePageAndStaticAssets(cache, pagePath) {
  try {
    const response = await fetch(pagePath, { cache: "reload" });
    if (!response.ok) return;

    const html = await response.clone().text();
    await cache.put(pagePath, response.clone());

    const assetMatches = html.match(/\/_next\/static\/[^"'\\\s<>]+?\.(?:js|css)/g) || [];
    const uniqueAssets = [...new Set(assetMatches)];
    await Promise.all(uniqueAssets.map((asset) => cacheAsset(cache, asset)));
  } catch {
    // 页面暂时不可用时继续缓存其他页面。
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(CORE_ASSETS.map((asset) => cacheAsset(cache, asset)));
      for (const page of PAGE_ASSETS) {
        await cachePageAndStaticAssets(cache, page);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    }

    const cached = await caches.match(request);
    if (cached) return cached;

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return (await caches.match("/offline.html")) || new Response("当前离线，且页面未缓存。", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("静态资源暂时不可用。", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({
              error: "当前处于离线状态，AI 需要联网。可先查看 /graph 的本地故障知识库。",
              offline: true,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            },
          ),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

