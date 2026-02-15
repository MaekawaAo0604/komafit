/**
 * Redux Store Configuration
 *
 * This file configures the Redux Toolkit store with all slices.
 */

import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import scheduleReducer from './scheduleSlice'
import undoReducer from './undoSlice'
import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    schedule: scheduleReducer,
    undo: undoReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializability check
        ignoredActions: ['auth/setUser', 'auth/setSession'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.session'],
      },
    }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
