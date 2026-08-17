/**
 * Firebase Web app config (P3-6/D26). These values are PUBLIC by design —
 * every Firebase web app ships them in its frontend bundle. Fill them from
 * Firebase console → Project settings:
 *  - firebaseConfig: General tab → "Your apps" → the Web app
 *  - VAPID_KEY:      Cloud Messaging tab → Web Push certificates → key pair
 *
 * While apiKey is empty, web push is silently disabled (everything else
 * keeps working) — same fallback philosophy as the mail setup.
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: 'easytask-9f54c.firebaseapp.com',
  projectId: 'easytask-9f54c',
  messagingSenderId: '',
  appId: '',
}

export const VAPID_KEY = ''

export const pushConfigured = FIREBASE_CONFIG.apiKey !== '' && VAPID_KEY !== ''
