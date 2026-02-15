import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getProfileRole } from '@/lib/repositories/profiles'
import type { User } from '@supabase/supabase-js'

/**
 * Get the current user or null (no redirect).
 * Wrapped with React cache() to deduplicate within a single request.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/**
 * Require an authenticated user. Redirects to login if not found.
 * For use in Server Components.
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * Require an admin user. Redirects non-admins to dashboard.
 * For use in Server Components (layouts/pages).
 */
export async function requireAdminPage(): Promise<User> {
  const user = await requireAuth()
  const role = await getProfileRole(user.id)
  if (role !== 'admin') {
    redirect('/dashboard')
  }
  return user
}

/**
 * Require an admin user for API routes.
 * Returns the service-role Supabase client if admin, null otherwise.
 * For use in API route handlers.
 */
export async function requireAdminApi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const role = await getProfileRole(user.id)
  if (role !== 'admin') return null

  const serviceSupabase = await createServiceClient()
  return { user, serviceSupabase }
}

/**
 * Require an authenticated user for API routes.
 * Returns the user or null.
 */
export async function requireAuthApi(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
