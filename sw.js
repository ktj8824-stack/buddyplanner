const CACHE_NAME = 'buddyplanner-v161-cache';
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
  './css/profile.css',
  './css/upgrade.css',
  './css/record.css',
  './css/community.css',
  './css/market.css',
  './css/admin.css',
  './css/ai.css',
  './js/config.js',
  './js/data.js',
  './js/api.js',
  './js/billing.js',
  './js/utils.js',
  './js/splash.js',
  './js/home.js',
  './js/calendar.js',
  './js/timeline.js',
  './js/register.js',
  './js/restaurant.js',
  './js/login.js',
  './js/onboarding.js',
  './js/profile.js',
  './js/upgrade.js',
  './js/record.js',
  './js/community.js',
  './js/market.js',
  './js/admin.js',
  './js/insurance.js',
  './js/event.js',
  './js/raffle.js',
  './js/ai.js',
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
        return caches.match(e.request);
      })
  );
});
