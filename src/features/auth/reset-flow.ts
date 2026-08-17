import { api } from '@/lib/api/client'

/**
 * Shared state for the 3-page code-based password flow
 * (email → /reset-code → /reset-password). sessionStorage survives
 * refreshes within the tab but dies with it.
 */
const EMAIL_KEY = 'easytask.resetEmail'
const CODE_KEY = 'easytask.resetCode'

export const resetFlow = {
  get email(): string | null {
    return sessionStorage.getItem(EMAIL_KEY)
  },
  get code(): string | null {
    return sessionStorage.getItem(CODE_KEY)
  },
  /** Requests a code for the address and remembers it for the next pages. */
  async start(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
    sessionStorage.setItem(EMAIL_KEY, email)
    sessionStorage.removeItem(CODE_KEY)
  },
  async verify(code: string): Promise<void> {
    await api.post('/auth/verify-reset-code', { token: code })
    sessionStorage.setItem(CODE_KEY, code)
  },
  async complete(newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token: this.code, newPassword })
    this.clear()
  },
  clear() {
    sessionStorage.removeItem(EMAIL_KEY)
    sessionStorage.removeItem(CODE_KEY)
  },
}
