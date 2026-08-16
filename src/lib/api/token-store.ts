/**
 * Token persistence (D19): access + refresh tokens in localStorage, same
 * session model as the Flutter app. The store is the single owner of the
 * keys so tests and logout can reset consistently.
 */
const ACCESS_KEY = 'easytask.accessToken'
const REFRESH_KEY = 'easytask.refreshToken'

export const tokenStore = {
  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
