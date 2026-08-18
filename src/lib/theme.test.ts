import { describe, it, expect, afterEach } from 'vitest'
import { applyTheme, effectiveTheme, storedTheme, toggleTheme } from './theme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('theme (P4-2)', () => {
  it('applies and persists the dark theme', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(storedTheme()).toBe('dark')
    expect(effectiveTheme()).toBe('dark')
  })

  it('toggles back to light and persists', () => {
    applyTheme('dark')
    expect(toggleTheme()).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(storedTheme()).toBe('light')
  })

  it('falls back to the OS preference when nothing is stored', () => {
    // jsdom matchMedia (test setup) reports light by default
    expect(storedTheme()).toBeNull()
    expect(effectiveTheme()).toBe('light')
  })
})
