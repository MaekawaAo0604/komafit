/**
 * UI Slice
 *
 * Manages global UI state including loading indicators, modals, and notifications.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Modal {
  id: string
  isOpen: boolean
  data?: any
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface UIState {
  globalLoading: boolean
  modals: Record<string, Modal>
  notifications: Notification[]
  sidebarOpen: boolean
}

const initialState: UIState = {
  globalLoading: false,
  modals: {},
  notifications: [],
  sidebarOpen: true,
}

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload
    },
    openModal: (
      state,
      action: PayloadAction<{ id: string; data?: any }>
    ) => {
      state.modals[action.payload.id] = {
        id: action.payload.id,
        isOpen: true,
        data: action.payload.data,
      }
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false
      }
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      )
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
  },
})

export const {
  setGlobalLoading,
  openModal,
  closeModal,
  addNotification,
  removeNotification,
  clearNotifications,
  toggleSidebar,
  setSidebarOpen,
} = uiSlice.actions

export default uiSlice.reducer

// Selectors
export const selectGlobalLoading = (state: { ui: UIState }) =>
  state.ui.globalLoading
export const selectModal = (modalId: string) => (state: { ui: UIState }) =>
  state.ui.modals[modalId]
export const selectIsModalOpen = (modalId: string) => (state: { ui: UIState }) =>
  state.ui.modals[modalId]?.isOpen ?? false
export const selectNotifications = (state: { ui: UIState }) =>
  state.ui.notifications
export const selectSidebarOpen = (state: { ui: UIState }) =>
  state.ui.sidebarOpen
