import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LocaleContext } from './I18n'
import { resolveLocale, translator } from './core'
import type { Locale } from './core'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(() => resolveLocale(new URL(window.location.href).searchParams.get('lang')))
  const setLocale = (next: Locale) => {
    const url = new URL(window.location.href)
    url.searchParams.set('lang', next)
    window.history.replaceState(null, '', url)
    updateLocale(next)
  }
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = translator(locale)('language.page_title')
  }, [locale])
  useEffect(() => {
    const changed = () => updateLocale(resolveLocale(new URL(window.location.href).searchParams.get('lang')))
    window.addEventListener('popstate', changed)
    return () => window.removeEventListener('popstate', changed)
  }, [])
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}
