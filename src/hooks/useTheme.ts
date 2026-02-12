import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '@/storage'
import type { Settings } from '@/types'

type Theme = Settings['theme']

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Load theme from storage on mount
  useEffect(() => {
    getSettings().then(settings => {
      setThemeState(settings.theme)
    })
  }, [])

  // Resolve theme (handle 'system' preference)
  useEffect(() => {
    const getResolvedTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme
    }

    const applyTheme = () => {
      const resolved = getResolvedTheme()
      setResolvedTheme(resolved)

      // Apply theme to document
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
      }
    }

    applyTheme()

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme()
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])

  // Update theme (persist to storage)
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    await updateSettings({ theme: newTheme })
  }

  return { theme, resolvedTheme, setTheme }
}
