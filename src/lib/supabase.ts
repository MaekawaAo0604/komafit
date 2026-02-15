/**
 * Supabase Client Initialization
 *
 * This module initializes and exports the Supabase client for the application.
 * It provides typed client instances for database operations and authentication.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

/**
 * Supabase client instance
 *
 * This client is configured with:
 * - Row Level Security (RLS) enforcement
 * - Automatic JWT token management
 * - TypeScript type safety via Database types
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/**
 * Helper function to get the current user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }

  return user
}

/**
 * Helper function to get the current user's role
 */
export async function getCurrentUserRole(): Promise<
  'admin' | 'teacher' | 'viewer' | null
> {
  const user = await getCurrentUser()
  if (!user) return null

  // Try to get role from JWT metadata first
  const role = user.user_metadata?.role as
    | 'admin'
    | 'teacher'
    | 'viewer'
    | undefined

  if (role) return role

  // Fallback: fetch from users table
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user role:', error)
    return null
  }

  return data.role as 'admin' | 'teacher' | 'viewer'
}

/**
 * Helper function to sign in
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Helper function to sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return !!session
}
