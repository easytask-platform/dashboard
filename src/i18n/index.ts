import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { ar } from './ar'

const LANG_KEY = 'easytask.lang'

export type AppLanguage = 'en' | 'ar'

export function storedLanguage(): AppLanguage {
  return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'
}

/** Flips document direction so the whole layout mirrors for Arabic. */
export function applyLanguage(lang: AppLanguage) {
  localStorage.setItem(LANG_KEY, lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  void i18n.changeLanguage(lang)
}

export function initI18n() {
  void i18n.use(initReactI18next).init({
    resources: { en, ar },
    lng: storedLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  applyLanguage(storedLanguage())
  return i18n
}

export default i18n
