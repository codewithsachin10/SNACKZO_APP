// Service Worker for Enhanced Push Notifications

const NOTIFICATION_ICONS = {
  order: '/icons/order-icon.png',
  promo: '/icons/promo-icon.png',
  delivery: '/icons/delivery-icon.png',
  default: '/favicon.ico'
};

const NOTIFICATION_SOUNDS = {
  order: '/sounds/order.mp3',
  delivery: '/sounds/delivery.mp3'
};

// Handle push notifications
// Handle push notifications
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data ? event.data.text() : 'no data'}"`);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.log('Push data is not JSON, using text as body');
      data = { title: 'New Notification', body: event.data.text() };
    }
  } else {
    data = { title: 'New Notification', body: 'You have a new message' };
  }

  const title = data.title || 'Hostel Mart';
  const options = {
    body: data.body || 'New update available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Get default actions based on notification type
function getDefaultActions(type) {
  switch (type) {
    case 'order':
    case 'order_update':
      return [
        { action: 'view', title: '📦 View Order', icon: '/icons/view.png' },
        { action: 'track', title: '📍 Track', icon: '/icons/track.png' }
      ];
    case 'delivery':
      return [
        { action: 'view', title: '📦 View Order', icon: '/icons/view.png' },
        { action: 'call', title: '📞 Call Runner', icon: '/icons/call.png' }
      ];
    case 'promo':
      return [
        { action: 'shop', title: '🛒 Shop Now', icon: '/icons/shop.png' },
        { action: 'dismiss', title: '❌ Dismiss', icon: '/icons/dismiss.png' }
      ];
    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/view.png' }
      ];
  }
}

// Notify all clients about the push notification for in-app display
async function notifyClients(data) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({
      type: 'PUSH_NOTIFICATION',
      data: data
    });
  }
}

// Handle notification click with action support
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click received:', event.action);

  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen = notificationData.url || '/';

  // Handle specific actions
  switch (event.action) {
    case 'view':
    case 'track':
      if (notificationData.orderId) {
        urlToOpen = `/orders/${notificationData.orderId}`;
      } else {
        urlToOpen = '/orders';
      }
      break;
    case 'call':
      // Can't make phone calls from SW, navigate to order page
      if (notificationData.orderId) {
        urlToOpen = `/orders/${notificationData.orderId}`;
      }
      break;
    case 'shop':
      urlToOpen = '/products';
      break;
    case 'dismiss':
      // Just close, already done above
      return;
    default:
      urlToOpen = notificationData.url || '/';
  }

  // Notify clients about the click action
  event.waitUntil(
    Promise.all([
      notifyClientsOfAction(event.action, notificationData),
      focusOrOpenWindow(urlToOpen)
    ])
  );
});

// Notify clients about notification action clicks
async function notifyClientsOfAction(action, data) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({
      type: 'NOTIFICATION_ACTION',
      action: action,
      data: data
    });
  }
}

// Focus existing window or open new one
async function focusOrOpenWindow(url) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of clientList) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      await client.navigate(url);
      return client.focus();
    }
  }

  if (clients.openWindow) {
    return clients.openWindow(url);
  }
}

// Handle notification close (for analytics)
self.addEventListener('notificationclose', function (event) {
  console.log('[Service Worker] Notification closed');

  const notificationData = event.notification.data || {};

  // Notify clients about the close
  event.waitUntil(
    notifyClientsOfAction('close', notificationData)
  );
});

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});
