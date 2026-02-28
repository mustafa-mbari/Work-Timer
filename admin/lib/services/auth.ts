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
 * Require an authenticated admin user. Redirects to login if not found or not admin.
 * For use in Server Components.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const role = await getProfileRole(user.id)
  if (role !== 'admin') {
    redirect('/login?error=forbidden')
  }
  return user
}

/**
 * Require an admin user for API routes.
 * Returns the service-role Supabase client if admin, 401/403 otherwise.
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
