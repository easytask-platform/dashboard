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
  apiKey: 'AIzaSyCcLV9THwtXIoTJtsahPrJENZIeNVdh_mw',
  authDomain: 'easytask-9f54c.firebaseapp.com',
  projectId: 'easytask-9f54c',
  storageBucket: 'easytask-9f54c.firebasestorage.app',
  messagingSenderId: '1091374993437',
  appId: '1:1091374993437:web:755408294be1d3395436f4',
}

export const VAPID_KEY: string =
  'BJJhiZ-ehIaxs4lNvWsNA3J_mZAR0lm1E34Gbz2zA0VI2_4iJRb2_OoKM5-7lUOCLDNIHBZ8LnU7IjxOqr8ZB88'

export const pushConfigured = FIREBASE_CONFIG.apiKey !== '' && VAPID_KEY !== ''
