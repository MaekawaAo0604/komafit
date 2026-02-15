/**
 * Undo Slice
 *
 * Manages undo history for teacher assignment operations.
 *
 * Requirements: REQ-12（Undo機能）
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type OperationType = 'ASSIGN' | 'CHANGE' | 'UNASSIGN'

interface UndoOperation {
  type: OperationType
  slotId: string
  prevTeacherId: string | null
  newTeacherId: string | null
  timestamp: string
}

interface UndoState {
  lastOperation: UndoOperation | null
}

const initialState: UndoState = {
  lastOperation: null,
}

// Slice
const undoSlice = createSlice({
  name: 'undo',
  initialState,
  reducers: {
    saveUndoSnapshot: (state, action: PayloadAction<UndoOperation>) => {
      state.lastOperation = action.payload
    },
    clearUndoSnapshot: (state) => {
      state.lastOperation = null
    },
  },
})

export const { saveUndoSnapshot, clearUndoSnapshot } = undoSlice.actions

export default undoSlice.reducer

// Selectors
export const selectLastOperation = (state: { undo: UndoState }) =>
  state.undo.lastOperation
export const selectCanUndo = (state: { undo: UndoState }) =>
  state.undo.lastOperation !== null
