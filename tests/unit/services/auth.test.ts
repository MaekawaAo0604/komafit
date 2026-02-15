import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signIn, signOut, getUser, getSession, getUserRole } from '@/services/auth'

/**
 * 認証サービスのユニットテスト
 *
 * Requirements: REQ-1（ロール・権限管理）
 */

// Supabaseクライアントのモック
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn', () => {
    it('should sign in with valid credentials', async () => {
      const mockUser = {
        id: '123',
        email: 'admin@komafit.local',
        user_metadata: { role: 'admin' },
      }

      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      } as any)

      const result = await signIn('admin@komafit.local', 'admin123')

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@komafit.local',
        password: 'admin123',
      })

      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
    })

    it('should throw error with invalid credentials', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', name: 'AuthError', status: 400 },
      } as any)

      await expect(signIn('invalid@test.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
    })

    it('should handle network errors', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(
        new Error('Network error')
      )

      await expect(signIn('admin@komafit.local', 'admin123')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      } as any)

      await expect(signOut()).resolves.toBeUndefined()

      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should throw error if sign out fails', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed', name: 'AuthError', status: 500 },
      } as any)

      await expect(signOut()).rejects.toThrow('Sign out failed')
    })
  })

  describe('getUser', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: '123',
        email: 'admin@komafit.local',
        user_metadata: { role: 'admin' },
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const user = await getUser()

      expect(user).toEqual(mockUser)
      expect(supabase.auth.getUser).toHaveBeenCalled()
    })

    it('should return null if no user is signed in', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any)

      const user = await getUser()

      expect(user).toBeNull()
    })

    it('should return null on error', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Error', name: 'AuthError', status: 500 },
      } as any)

      const user = await getUser()

      expect(user).toBeNull()
    })
  })

  describe('getSession', () => {
    it('should return current session', async () => {
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000,
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any)

      const session = await getSession()

      expect(session).toEqual(mockSession)
      expect(supabase.auth.getSession).toHaveBeenCalled()
    })

    it('should return null if no session exists', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any)

      const session = await getSession()

      expect(session).toBeNull()
    })
  })

  describe('getUserRole', () => {
    it('should return role from user metadata', async () => {
      const mockUser = {
        id: '123',
        email: 'admin@komafit.local',
        user_metadata: { role: 'admin' },
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const role = await getUserRole()

      expect(role).toBe('admin')
    })

    it('should fetch role from database if not in metadata', async () => {
      const mockUser = {
        id: '123',
        email: 'teacher1@komafit.local',
        user_metadata: {},
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'teacher' },
              error: null,
            }),
          })),
        })),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const role = await getUserRole()

      expect(role).toBe('teacher')
      expect(supabase.from).toHaveBeenCalledWith('users')
    })

    it('should return null if user is not signed in', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any)

      const role = await getUserRole()

      expect(role).toBeNull()
    })

    it('should return null on database error', async () => {
      const mockUser = {
        id: '123',
        email: 'teacher1@komafit.local',
        user_metadata: {},
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error' },
            }),
          })),
        })),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const role = await getUserRole()

      expect(role).toBeNull()
    })
  })
})
