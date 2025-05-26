const CACHE_NAME = 'mood-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/styles.css',
  '/manifest.json'
];

// تثبيت Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// استراتيجية الشبكة أولاً ثم التخزين المؤقت
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // نسخ الاستجابة لأننا سنستخدمها مرتين
        const responseToCache = response.clone();
        
        // تخزين الاستجابة في التخزين المؤقت
        caches.open(CACHE_NAME)
          .then(cache => {
            // تخزين فقط الطلبات الناجحة
            if (event.request.method === 'GET' && response.status === 200) {
              cache.put(event.request, responseToCache);
            }
          });
        
        return response;
      })
      .catch(() => {
        // إذا فشل الاتصال بالشبكة، استخدم النسخة المخزنة مؤقتًا
        return caches.match(event.request);
      })
  );
});

// تحديث التخزين المؤقت عند تحديث Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
