/**
 * Theme preference (P4-2/D31, FR-12). Device-local by design: stored in
 * localStorage, applied as a `.dark` class on <html>. The pre-paint inline
 * script in index.html reads the same key so a reload never flashes light.
 * No stored value = follow the OS (`prefers-color-scheme`).
 */
const STORAGE_KEY = 'easytask.theme'

export type Theme = 'light' | 'dark'

export function storedTheme(): Theme | null {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

export function effectiveTheme(): Theme {
  return (
    storedTheme() ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
}

export function applyTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function toggleTheme(): Theme {
  const next: Theme = effectiveTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
