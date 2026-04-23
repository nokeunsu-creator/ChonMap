const CACHE_NAME = 'chonmap-v1.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/'))
      )
  );
});

// 생일 알림: 앱에서 메시지 수신 → 시스템 알림 표시
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'BIRTHDAY_NOTIFY') return;

  const { todayList, tomorrowList } = event.data;

  const notifications = [];
  if (todayList && todayList.length > 0) {
    notifications.push({
      title: '🎂 오늘 생일!',
      body: `${todayList.join(', ')}의 생일입니다. 축하해주세요!`,
    });
  }
  if (tomorrowList && tomorrowList.length > 0) {
    notifications.push({
      title: '🎁 내일 생일 예정',
      body: `내일은 ${tomorrowList.join(', ')}의 생일입니다.`,
    });
  }

  const shown = notifications.map(({ title, body }) =>
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'chonmap-birthday',
      renotify: true,
    })
  );

  event.waitUntil(Promise.all(shown));
});

// 알림 클릭 시 앱 포커스
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
