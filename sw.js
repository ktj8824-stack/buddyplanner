const CACHE_NAME = 'buddyplanner-v263-cache';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './images/banner_ad.png',
  './img/buddybirdie_app_icon.png',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/calendar.css',
  './css/home.css',
  './css/timeline.css',
  './css/register.css',
  './css/restaurant.css',
  './css/splash.css',
  './css/login.css',
  './css/v2.css',
  './css/profile.css',
  './css/upgrade.css',
  './css/record.css',
  './css/community.css',
  './css/market.css',
  './css/admin.css',
  './css/ai.css',
  './css/group.css',
  './js/config.js',
  './js/data.js',
  './js/api.js',
  './js/billing.js',
  './js/points.js',
  './js/utils.js',
  './js/ios-bridge.js',
  './js/cloud.js',
  './js/splash.js',
  './js/home.js',
  './js/calendar.js',
  './js/timeline.js',
  './js/register.js',
  './js/homeadd-guide.js',
  './js/homeadd.js',
  './js/restaurant.js',
  './js/login.js',
  './js/onboarding.js',
  './js/profile.js',
  './js/upgrade.js',
  './js/record.js',
  './js/community.js',
  './js/market.js',
  './js/admin.js',
  './js/admin-raffle.js',
  './js/raffle.js',
  './js/courseguide.js',
  './js/ai-agent.js',
  './js/ai.js',
  './js/group.js',
  './js/autonav.js',
  './js/app.js'
];

// Install Event
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clear all old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Immediately reload all clients when a new SW takes over
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Fetch Event (Network First, fallback to Cache)
self.addEventListener('fetch', e => {
  // 내 사이트 파일만 (길찾기·서버 응답·POST 는 캐시하지 않음)
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // 네트워크 성공 시 캐시 업데이트
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시 반환
        return caches.match(e.request, { ignoreSearch: true });
      })
  );
});

// '다음 이동' 알림을 누르면 → 앱을 ?go=next 로 열어 바로 길안내
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => c.url.startsWith(self.registration.scope));
    if (w) { try { await w.focus(); if ('navigate' in w) { await w.navigate(url); return; } } catch (err) { } }
    await self.clients.openWindow(url);
  })());
});
