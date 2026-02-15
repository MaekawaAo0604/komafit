/**
 * Authentication Service
 *
 * This service provides authentication-related functionality using Supabase Auth.
 * It handles sign in, sign out, user retrieval, and role management.
 *
 * Requirements: REQ-1（ロール・権限管理）
 */

import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/entities'

/**
 * Sign in with email and password
 *
 * @param email - User email
 * @param password - User password
 * @returns User and session data
 * @throws Error if sign in fails
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user || !data.session) {
    throw new Error('Sign in failed: No user or session returned')
  }

  return {
    user: data.user,
    session: data.session,
  }
}

/**
 * Sign out the current user
 *
 * @throws Error if sign out fails
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Get the current authenticated user
 *
 * @returns User object or null if not authenticated
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return user
}

/**
 * Get the current session
 *
 * @returns Session object or null if no active session
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('Error fetching session:', error)
    return null
  }

  return session
}

/**
 * Get the current user's role
 *
 * First checks user_metadata in JWT, then falls back to database query.
 *
 * @returns User role or null if not authenticated or role not found
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getUser()
  if (!user) return null

  // Try to get role from JWT metadata first
  const role = user.user_metadata?.role as UserRole | undefined

  if (role) {
    return role
  }

  // Fallback: fetch from users table
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    return data.role as UserRole
  } catch (err) {
    console.error('Exception fetching user role:', err)
    return null
  }
}

/**
 * Check if a user is authenticated
 *
 * @returns True if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return !!session
}

/**
 * Check if the current user has admin role
 *
 * @returns True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

/**
 * Check if the current user has teacher role
 *
 * @returns True if user is teacher, false otherwise
 */
export async function isTeacher(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'teacher'
}

/**
 * Check if the current user has viewer role
 *
 * @returns True if user is viewer, false otherwise
 */
export async function isViewer(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'viewer'
}

/**
 * Create a teacher user account with auto-generated password
 *
 * This function:
 * 1. Generates a random password
 * 2. Creates a users table record (via RPC)
 *
 * Note: Actual Supabase Auth account provisioning must be done separately
 * via Supabase Dashboard or Admin API.
 *
 * @param email - User email
 * @param name - User name
 * @returns Object with userId and generated password
 * @throws Error if user creation fails
 */
export async function createTeacherUser(
  email: string,
  name: string
): Promise<{ userId: string; password: string }> {
  // Import password generator dynamically to avoid circular dependencies
  const { generatePassword } = await import('@/utils/passwordGenerator')

  // Generate random password
  const password = generatePassword(12)

  // Create user record in database
  const { data, error } = await supabase.rpc('create_teacher_user', {
    p_email: email,
    p_name: name,
    p_password: password,
  })

  if (error) {
    console.error('RPC Error details:', error)
    // Check for duplicate email error
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new Error(
        `このメールアドレス（${email}）は既に登録されています。別のメールアドレスを使用してください。`
      )
    }
    throw new Error(`Failed to create teacher user: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to create teacher user: No user ID returned')
  }

  return {
    userId: data as string,
    password,
  }
}
