/* Standard Web Push service worker (VAPID, no Firebase).
 * Handles incoming push messages and notification clicks. */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'إشعار جديد', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'إشعار جديد';
  const options = {
    body: payload.body || '',
    icon: '/images/logo/logo-icon.svg',
    badge: '/images/logo/logo-icon.svg',
    dir: 'rtl',
    data: payload.data || {},
    tag: (payload.data && payload.data.convention_id) ? ('conv-' + payload.data.convention_id) : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/dashboard');
    })
  );
});
