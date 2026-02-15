/**
 * Auth Slice
 *
 * Manages authentication state including user, session, and role.
 *
 * Requirements: REQ-1（ロール・権限管理）
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { UserRole } from '@/types/entities'
import * as authService from '@/services/auth'

interface AuthState {
  user: SupabaseUser | null
  session: Session | null
  role: UserRole | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: false,
  error: null,
}

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const result = await authService.signIn(email, password)
    const role = await authService.getUserRole()
    return { user: result.user, session: result.session, role }
  }
)

export const logoutAsync = createAsyncThunk('auth/logout', async () => {
  await authService.signOut()
})

export const checkAuthAsync = createAsyncThunk('auth/checkAuth', async () => {
  const user = await authService.getUser()
  const session = await authService.getSession()
  const role = await authService.getUserRole()
  return { user, session, role }
})

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SupabaseUser | null>) => {
      state.user = action.payload
    },
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload
    },
    setRole: (state, action: PayloadAction<UserRole | null>) => {
      state.role = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.session = action.payload.session
        state.role = action.payload.role
        state.error = null
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Login failed'
      })

    // Logout
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.session = null
        state.role = null
        state.error = null
      })
      .addCase(logoutAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Logout failed'
      })

    // Check auth
    builder
      .addCase(checkAuthAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(checkAuthAsync.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.session = action.payload.session
        state.role = action.payload.role
      })
      .addCase(checkAuthAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Auth check failed'
      })
  },
})

export const { setUser, setSession, setRole, setError, clearError } =
  authSlice.actions

export default authSlice.reducer

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectSession = (state: { auth: AuthState }) => state.auth.session
export const selectRole = (state: { auth: AuthState }) => state.auth.role
export const selectAuthLoading = (state: { auth: AuthState }) =>
  state.auth.loading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  !!state.auth.user
export const selectIsAdmin = (state: { auth: AuthState }) =>
  state.auth.role === 'admin'
export const selectIsTeacher = (state: { auth: AuthState }) =>
  state.auth.role === 'teacher'
export const selectIsViewer = (state: { auth: AuthState }) =>
  state.auth.role === 'viewer'
