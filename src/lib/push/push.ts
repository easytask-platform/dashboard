import { api } from '@/lib/api/client'
import { FIREBASE_CONFIG, VAPID_KEY, pushConfigured } from './firebase-config'

export interface ForegroundPush {
  title: string
  body: string
  taskId: string | null
}

let currentToken: string | null = null

/**
 * Web push (P3-6/D26). The backend sends DATA-ONLY FCM messages
 * (notificationId, taskId, title, body): in the foreground we surface them
 * via the callback (toast + badge refresh); in the background the service
 * worker (public/firebase-messaging-sw.js) renders the system notification.
 *
 * No-ops gracefully when Firebase isn't configured, the browser lacks
 * support, or the user declines the permission prompt.
 */
export async function enableWebPush(onForeground: (push: ForegroundPush) => void): Promise<void> {
  if (!pushConfigured) return
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const { initializeApp, getApps } = await import('firebase/app')
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
    const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG)
    const messaging = getMessaging(app)

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return

    await api.post('/me/devices', { token, platform: 'WEB' })
    currentToken = token

    onMessage(messaging, (payload) => {
      const data = payload.data ?? {}
      onForeground({
        title: data.title ?? 'EasyTask',
        body: data.body ?? '',
        taskId: data.taskId ?? null,
      })
    })
  } catch (error) {
    // Push is a nice-to-have: never let it break the app.
    console.warn('Web push disabled:', error)
  }
}

/** Called BEFORE logout clears tokens (the delete needs the session). */
export async function disableWebPush(): Promise<void> {
  if (!currentToken) return
  try {
    await api.delete(`/me/devices/${encodeURIComponent(currentToken)}`)
  } catch {
    // Token pruning also happens server-side on send failures.
  } finally {
    currentToken = null
  }
}
