/* global firebase, clients, importScripts */
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDNy82azv_tH5SNe_52eWwwHQATYtgXgh4',
  authDomain: 'fire-tracker-ed183.firebaseapp.com',
  projectId: 'fire-tracker-ed183',
  storageBucket: 'fire-tracker-ed183.firebasestorage.app',
  messagingSenderId: '419744627127',
  appId: '1:419744627127:web:16516d132fee41bdbf5032',
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const options = {
    body: notification.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  };
  return self.registration.showNotification(notification.title || 'لجنة السلامة', options);
});
