import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '@/storage'
import type { Settings } from '@/types'

type ThemeId = Settings['theme']

export interface ThemeMeta {
  id: ThemeId
  label: string
  isDark: boolean
  swatchBg: string
  swatchAccent: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'light-sepia',   label: 'White',    isDark: false, swatchBg: '#FAFAFA', swatchAccent: '#6366F1' },
  { id: 'light-soft',    label: 'Soft',     isDark: false, swatchBg: '#F2F2F0', swatchAccent: '#6366F1' },
  { id: 'light-paper',   label: 'Paper',    isDark: false, swatchBg: '#F4EFE6', swatchAccent: '#6366F1' },
  { id: 'dark-charcoal', label: 'Charcoal', isDark: true,  swatchBg: '#3A3A3A', swatchAccent: '#818CF8' },
  { id: 'dark-midnight', label: 'Midnight', isDark: true,  swatchBg: '#1C2638', swatchAccent: '#818CF8' },
  { id: 'dark-mocha',    label: 'Black',    isDark: true,  swatchBg: '#0A0806', swatchAccent: '#818CF8' },
]

function migrateTheme(stored: string): ThemeId {
  if (stored === 'light') return 'light-soft'
  if (stored === 'dark') return 'dark-charcoal'
  return stored as ThemeId
}

function applyTheme(themeId: ThemeId, systemIsDark: boolean) {
  const resolved = themeId === 'system'
    ? (systemIsDark ? 'dark-charcoal' : 'light-soft')
    : themeId

  const isDark = resolved.startsWith('dark-')
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.classList.toggle('light', !isDark)
  document.documentElement.setAttribute('data-theme', resolved)
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>('light-soft')

  useEffect(() => {
    getSettings().then(settings => {
      setThemeState(migrateTheme(settings.theme))
    })
  }, [])

  useEffect(() => {
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(theme, systemIsDark)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme(theme, mq.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const setTheme = async (newTheme: ThemeId) => {
    setThemeState(newTheme)
    await updateSettings({ theme: newTheme })
  }

  return { theme, setTheme }
}
