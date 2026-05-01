const CACHE_NAME = 'chonmap-v1.4.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app/',
  '/app/index.html',
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
  const url = new URL(event.request.url);
  // 외부 origin은 SW가 개입하지 않음 (브라우저 기본 처리)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // 네비게이션 요청만 SPA 셸로 fallback (JS/CSS/이미지는 그냥 실패)
          if (event.request.mode === 'navigate') {
            if (url.pathname.startsWith('/app')) return caches.match('/app/');
            return caches.match('/');
          }
          return Response.error();
        })
      )
  );
});

// 생일 알림: 앱에서 메시지 수신 → 시스템 알림 표시
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) return;
  if (!event.data || event.data.type !== 'BIRTHDAY_NOTIFY') return;

  const sanitize = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 20).map((s) => String(s).slice(0, 50));
  };
  const todayList = sanitize(event.data.todayList);
  const tomorrowList = sanitize(event.data.tomorrowList);

  const notifications = [];
  if (todayList.length > 0) {
    notifications.push({
      title: '🎂 오늘 생일!',
      body: `${todayList.join(', ')}의 생일입니다. 축하해주세요!`,
    });
  }
  if (tomorrowList.length > 0) {
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
      return self.clients.openWindow('/app/');
    })
  );
});
