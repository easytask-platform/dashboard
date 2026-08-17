/* global importScripts, firebase, clients */
/**
 * FCM background handler (P3-6/D26). The backend sends DATA-ONLY messages,
 * so this worker renders the system notification itself and deep-links to
 * the task on click. Config values mirror src/lib/push/firebase-config.ts
 * (they are public by design). While apiKey is empty this worker is inert.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: 'easytask-9f54c.firebaseapp.com',
  projectId: 'easytask-9f54c',
  messagingSenderId: '',
  appId: '',
};

if (FIREBASE_CONFIG.apiKey) {
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    self.registration.showNotification(data.title || 'EasyTask', {
      body: data.body || '',
      icon: '/vite.svg',
      tag: data.notificationId || undefined,
      data: { taskId: data.taskId || null },
    });
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const taskId = event.notification.data && event.notification.data.taskId;
    const url = taskId ? '/tasks/' + taskId : '/notifications';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(url);
            return;
          }
        }
        return clients.openWindow(url);
      }),
    );
  });
}
