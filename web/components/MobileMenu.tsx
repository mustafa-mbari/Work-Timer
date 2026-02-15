"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MobileMenuProps {
  user: { email: string; displayName: string | null; role: "user" | "admin" } | null
}

const authLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/billing", label: "Billing" },
]

const adminLinks = [
  { href: "/admin", label: "Admin Panel" },
]

export function MobileMenu({ user }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.push("/login")
    router.refresh()
  }

  const links = user
    ? [...authLinks, ...(user.role === "admin" ? adminLinks : [])]
    : []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {user ? (
            <>
              <div className="px-3 py-2 text-xs font-medium text-stone-400 uppercase tracking-wider">
                Navigation
              </div>
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    pathname === href || pathname.startsWith(href + "/")
                      ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/20 dark:text-indigo-300"
                      : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-[var(--dark-hover)]"
                  )}
                >
                  {label}
                </Link>
              ))}
              <div className="my-3 border-t border-stone-200 dark:border-[var(--dark-border)]" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-[var(--dark-hover)] transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-[var(--dark-hover)] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
          <div className="my-3 border-t border-stone-200 dark:border-[var(--dark-border)]" />
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Theme</span>
            <ThemeToggle />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
