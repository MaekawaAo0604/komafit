/**
 * Schedule Slice
 *
 * Manages weekly schedule state including all slots with students and teachers.
 *
 * Requirements: REQ-5, REQ-13（授業枠管理、割当ボード表示）
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { BoardSlot, DayOfWeek } from '@/types/entities'
import * as slotsService from '@/services/slots'

interface ScheduleState {
  slots: Record<string, BoardSlot> // key: slotId (e.g., "MON-0")
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

const initialState: ScheduleState = {
  slots: {},
  loading: false,
  error: null,
  lastUpdated: null,
}

// Async thunks
export const fetchScheduleAsync = createAsyncThunk(
  'schedule/fetchSchedule',
  async () => {
    const slots = await slotsService.getAllBoardSlots()
    return slots
  }
)

export const fetchSlotAsync = createAsyncThunk(
  'schedule/fetchSlot',
  async (slotId: string) => {
    const slot = await slotsService.getBoardSlot(slotId)
    return slot
  }
)

export const assignTeacherAsync = createAsyncThunk(
  'schedule/assignTeacher',
  async ({
    slotId,
    position,
    teacherId,
    assignedBy,
  }: {
    slotId: string
    position: number
    teacherId: string
    assignedBy: string
  }) => {
    await slotsService.assignTeacherToSlot(slotId, position, teacherId, assignedBy)
    // Fetch updated slot
    const slot = await slotsService.getBoardSlot(slotId)
    return slot
  }
)

export const changeTeacherAsync = createAsyncThunk(
  'schedule/changeTeacher',
  async ({
    slotId,
    position,
    newTeacherId,
    assignedBy,
  }: {
    slotId: string
    position: number
    newTeacherId: string
    assignedBy: string
  }) => {
    await slotsService.changeTeacherForSlot(slotId, position, newTeacherId, assignedBy)
    // Fetch updated slot
    const slot = await slotsService.getBoardSlot(slotId)
    return slot
  }
)

export const unassignTeacherAsync = createAsyncThunk(
  'schedule/unassignTeacher',
  async ({ slotId, position, assignedBy }: { slotId: string; position: number; assignedBy: string }) => {
    await slotsService.unassignTeacherFromSlot(slotId, position, assignedBy)
    // Fetch updated slot
    const slot = await slotsService.getBoardSlot(slotId)
    return slot
  }
)

export const assignStudentAsync = createAsyncThunk(
  'schedule/assignStudent',
  async ({
    slotId,
    position,
    seat,
    studentId,
    subject,
    grade,
  }: {
    slotId: string
    position: number
    seat: 1 | 2
    studentId: string
    subject: string
    grade: number
  }) => {
    await slotsService.assignStudentToSlotPosition(slotId, position, seat, studentId, subject, grade)
    // Fetch updated slot
    const slot = await slotsService.getBoardSlot(slotId)
    return slot
  }
)

export const unassignStudentAsync = createAsyncThunk(
  'schedule/unassignStudent',
  async ({ slotId, position, seat }: { slotId: string; position: number; seat: 1 | 2 }) => {
    await slotsService.unassignStudentFromSlotPosition(slotId, position, seat)
    // Fetch updated slot
    const slot = await slotsService.getBoardSlot(slotId)
    return slot
  }
)

// Slice
const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    setSlots: (state, action: PayloadAction<BoardSlot[]>) => {
      state.slots = {}
      action.payload.forEach((slot) => {
        state.slots[slot.id] = slot
      })
      state.lastUpdated = new Date().toISOString()
    },
    updateSlot: (state, action: PayloadAction<BoardSlot>) => {
      state.slots[action.payload.id] = action.payload
      state.lastUpdated = new Date().toISOString()
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch schedule
    builder
      .addCase(fetchScheduleAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchScheduleAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots = {}
        action.payload.forEach((slot) => {
          state.slots[slot.id] = slot
        })
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchScheduleAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch schedule'
      })

    // Fetch single slot
    builder
      .addCase(fetchSlotAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSlotAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots[action.payload.id] = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchSlotAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch slot'
      })

    // Assign teacher
    builder
      .addCase(assignTeacherAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(assignTeacherAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots[action.payload.id] = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(assignTeacherAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to assign teacher'
      })

    // Change teacher
    builder
      .addCase(changeTeacherAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(changeTeacherAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots[action.payload.id] = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(changeTeacherAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to change teacher'
      })

    // Unassign teacher
    builder
      .addCase(unassignTeacherAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(unassignTeacherAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots[action.payload.id] = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(unassignTeacherAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to unassign teacher'
      })

    // Assign student
    builder
      .addCase(assignStudentAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(assignStudentAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots[action.payload.id] = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(assignStudentAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to assign student'
      })

    // Unassign student
    builder
      .addCase(unassignStudentAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(unassignStudentAsync.fulfilled, (state, action) => {
        state.loading = false
        state.slots[action.payload.id] = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(unassignStudentAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to unassign student'
      })
  },
})

export const { setSlots, updateSlot, setError, clearError } =
  scheduleSlice.actions

export default scheduleSlice.reducer

// Selectors
export const selectAllSlots = (state: { schedule: ScheduleState }) =>
  Object.values(state.schedule.slots)
export const selectSlotById = (slotId: string) => (state: { schedule: ScheduleState }) =>
  state.schedule.slots[slotId]
export const selectSlotsByDay = (day: DayOfWeek) => (state: { schedule: ScheduleState }) =>
  Object.values(state.schedule.slots).filter((slot) => slot.day === day)
export const selectScheduleLoading = (state: { schedule: ScheduleState }) =>
  state.schedule.loading
export const selectScheduleError = (state: { schedule: ScheduleState }) =>
  state.schedule.error
export const selectLastUpdated = (state: { schedule: ScheduleState }) =>
  state.schedule.lastUpdated
