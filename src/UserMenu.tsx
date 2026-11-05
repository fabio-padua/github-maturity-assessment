import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useI18n } from './i18n/I18n'
import { languageNames, locales } from './i18n/core'

export function UserMenu() {
  const { t, locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const navigate = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])
    const current = items.findIndex(item => item === document.activeElement)
    const directions: Record<string, number> = { ArrowDown: (current + 1) % items.length, ArrowUp: (current - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }
    if (event.key in directions) { event.preventDefault(); items[directions[event.key]]?.focus() }
    if (event.key === 'Tab') setOpen(false)
  }
  return <div className="user-preferences" ref={container} onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={trigger} type="button" className="user-menu-trigger" aria-label={t('language.menu')}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
      }}>
      <span className="avatar" aria-hidden="true">LM</span>
      <span className="locale-code" aria-hidden="true">{locale === 'pt-BR' ? 'PT' : locale.toUpperCase()}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>
    {open && <div className="user-menu-panel" id={id} role="menu" aria-label={t('language.title')} ref={menu} onKeyDown={navigate}>
      <p className="user-menu-heading" role="presentation">{t('language.title')}</p>
      {locales.map(value => <button key={value} type="button" role="menuitemradio" aria-checked={locale === value}
        tabIndex={locale === value ? 0 : -1} lang={value} onClick={() => { setLocale(value); close() }}>
        <span>{languageNames[value]}</span><span aria-hidden="true">{locale === value ? '✓' : ''}</span>
      </button>)}
      <p className="user-menu-note" role="presentation">{t('language.note')}</p>
    </div>}
  </div>
}
