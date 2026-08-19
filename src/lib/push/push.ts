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
/** True when we should show the "enable notifications" affordance. */
export function pushAvailable(): boolean {
  return (
    pushConfigured &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    Notification.permission !== 'denied'
  )
}

export function pushGranted(): boolean {
  return pushAvailable() && Notification.permission === 'granted'
}

async function messagingInstance() {
  const { initializeApp, getApps } = await import('firebase/app')
  const { getMessaging } = await import('firebase/messaging')
  return getMessaging(getApps()[0] ?? initializeApp(FIREBASE_CONFIG))
}

/**
 * Requests notification permission and registers this browser's FCM token.
 * Browsers suppress permission prompts that don't come from a user gesture,
 * so this is called right after a successful login/sign-up (a real gesture)
 * for first-time opt-in, and again silently on shell mount for users who
 * already granted it (requestPermission resolves instantly then, no prompt).
 * No-ops when unsupported or the user declines.
 */
export async function enablePush(): Promise<void> {
  if (!pushConfigured) return
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const { getToken } = await import('firebase/messaging')
    const messaging = await messagingInstance()
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return

    await api.post('/me/devices', { token, platform: 'WEB' })
    currentToken = token
  } catch (error) {
    // Push is a nice-to-have: never let it break the app.
    console.warn('Web push disabled:', error)
  }
}

/**
 * Foreground message handler (toast + badge refresh). Runs where React context
 * is available (the app shell); self-gates so it only listens once permission
 * is granted. Background messages are handled by firebase-messaging-sw.js.
 */
export async function listenForegroundPush(
  onForeground: (push: ForegroundPush) => void,
): Promise<void> {
  if (!pushGranted()) return
  try {
    const { onMessage } = await import('firebase/messaging')
    const messaging = await messagingInstance()
    onMessage(messaging, (payload) => {
      const data = payload.data ?? {}
      onForeground({
        title: data.title ?? 'EasyTask',
        body: data.body ?? '',
        taskId: data.taskId ?? null,
      })
    })
  } catch (error) {
    console.warn('Foreground push listener failed:', error)
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
