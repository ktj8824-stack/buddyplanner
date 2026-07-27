const CACHE_NAME = 'buddyplanner-v126-cache';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/calendar.css',
  './css/home.css',
  './css/timeline.css',
  './css/register.css',
  './css/restaurant.css',
  './css/login.css',
  './images/banner_ad.png',
  './css/profile.css',
  './css/upgrade.css',
  './css/record.css',
  './css/community.css',
  './css/calendar.css',
  './js/data.js',
  './js/api.js',
  './js/utils.js',
  './js/home.js',
  './js/timeline.js',
  './js/register.js',
  './js/restaurant.js',
  './js/login.js',
  './js/onboarding.js',
  './js/profile.js',
  './js/upgrade.js',
  './js/record.js',
  './js/community.js',
  './js/calendar.js',
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

// Activate Event
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
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
