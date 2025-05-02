// Service Worker للتذكيرات
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.message || 'حان وقت ملء استبيان المزاج اليومي!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('مزاج حبيبتي', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
