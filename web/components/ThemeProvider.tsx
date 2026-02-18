"use client"

import { useState, useEffect, type ReactNode } from "react"
import {
  ThemeContext,
  type Theme,
  getSystemTheme,
  storeTheme,
  applyTheme,
} from "@/lib/theme"

interface ThemeProviderProps {
  children: ReactNode
  /** Server-read cookie value — ensures SSR and client agree on initial state */
  initialTheme?: Theme
}

export function ThemeProvider({ children, initialTheme = "system" }: ThemeProviderProps) {
  // Use the server-provided theme as initial state to avoid hydration mismatch
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    // During SSR, default to "light" for system theme (we can't detect OS preference on server)
    // The inline script in <head> already applies the correct class before first paint
    initialTheme === "system" ? "light" : initialTheme
  )

  function setTheme(next: Theme) {
    setThemeState(next)
    storeTheme(next)
    const resolved = next === "system" ? getSystemTheme() : next
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }

  // Resolve actual theme after mount (handles "system" preference detection)
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme
    setResolvedTheme(resolved) // eslint-disable-line react-hooks/set-state-in-effect
    applyTheme(resolved)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    function handleChange() {
      if (theme === "system") {
        const next = getSystemTheme()
        setResolvedTheme(next)
        applyTheme(next)
      }
    }
    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [theme])

  return (
    <ThemeContext value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext>
  )
}
