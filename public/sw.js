// CarConnect Service Worker
const CACHE_NAME = 'carconnect-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle Push Events
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Someone is near your Blue Swift';
  const body = data.body || 'Tap to answer';
  const callId = data.callId || 'unknown';
  const carId = data.carId || '';

  const options = {
    body: body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    requireInteraction: true,
    tag: callId,
    data: {
      callId: callId,
      carId: carId,
      url: `/call/${callId}`
    },
    actions: [
      { action: 'accept', title: 'Accept' },
      { action: 'decline', title: 'Decline' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action; // 'accept', 'decline', or empty (clicked body)
  const notificationData = event.notification.data || {};
  const callId = notificationData.callId;

  let targetUrl = `/call/${callId}`;
  if (action === 'accept') {
    targetUrl = `/call/${callId}?action=accept`;
  } else if (action === 'decline') {
    targetUrl = `/call/${callId}?action=decline`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Look for an existing open CarConnect window
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
