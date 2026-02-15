"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme, type Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-stone-100 p-1 dark:bg-[var(--dark-elevated)]">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            theme === value
              ? "bg-white text-stone-900 shadow-sm dark:bg-[var(--dark-card)] dark:text-stone-100"
              : "text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          )}
          aria-label={`Switch to ${label} theme`}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
