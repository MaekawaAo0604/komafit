/**
 * Database Type Definitions
 *
 * This file contains TypeScript types generated from the Supabase schema.
 * In production, these types should be generated automatically using:
 * `supabase gen types typescript --project-id <project-id> > src/types/database.ts`
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string
          role: 'admin' | 'teacher' | 'viewer'
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          name: string
          role: 'admin' | 'teacher' | 'viewer'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          name?: string
          role?: 'admin' | 'teacher' | 'viewer'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          user_id: string | null
          name: string
          active: boolean
          cap_week_slots: number
          cap_students: number
          allow_pair: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          active?: boolean
          cap_week_slots: number
          cap_students: number
          allow_pair?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          active?: boolean
          cap_week_slots?: number
          cap_students?: number
          allow_pair?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      teacher_skills: {
        Row: {
          teacher_id: string
          subject: string
          grade_min: number
          grade_max: number
        }
        Insert: {
          teacher_id: string
          subject: string
          grade_min: number
          grade_max: number
        }
        Update: {
          teacher_id?: string
          subject?: string
          grade_min?: number
          grade_max?: number
        }
      }
      teacher_availability: {
        Row: {
          teacher_id: string
          slot_id: string
          is_available: boolean
          updated_at: string
        }
        Insert: {
          teacher_id: string
          slot_id: string
          is_available?: boolean
          updated_at?: string
        }
        Update: {
          teacher_id?: string
          slot_id?: string
          is_available?: boolean
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          name: string
          grade: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          grade: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          grade?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      student_subjects: {
        Row: {
          student_id: string
          subject: string
        }
        Insert: {
          student_id: string
          subject: string
        }
        Update: {
          student_id?: string
          subject?: string
        }
      }
      student_ng: {
        Row: {
          student_id: string
          teacher_id: string
        }
        Insert: {
          student_id: string
          teacher_id: string
        }
        Update: {
          student_id?: string
          teacher_id?: string
        }
      }
      slots: {
        Row: {
          id: string
          day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
          koma_code: '0' | '1' | 'A' | 'B' | 'C'
        }
        Insert: {
          id: string
          day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
          koma_code: '0' | '1' | 'A' | 'B' | 'C'
        }
        Update: {
          id?: string
          day?: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
          koma_code?: '0' | '1' | 'A' | 'B' | 'C'
        }
      }
      slot_students: {
        Row: {
          slot_id: string
          seat: 1 | 2
          student_id: string
          subject: string
          grade: number
        }
        Insert: {
          slot_id: string
          seat: 1 | 2
          student_id: string
          subject: string
          grade: number
        }
        Update: {
          slot_id?: string
          seat?: 1 | 2
          student_id?: string
          subject?: string
          grade?: number
        }
      }
      slot_teacher: {
        Row: {
          slot_id: string
          teacher_id: string | null
          assigned_by: string | null
          assigned_at: string | null
        }
        Insert: {
          slot_id: string
          teacher_id?: string | null
          assigned_by?: string | null
          assigned_at?: string | null
        }
        Update: {
          slot_id?: string
          teacher_id?: string | null
          assigned_by?: string | null
          assigned_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string
          action: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          action: string
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          action?: string
          payload?: Json
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: number
          load_weight: number
          continuity_weight: number
          grade_diff_weight: number
          pair_same_subject_required: boolean
          pair_max_grade_diff: number
          updated_at: string
        }
        Insert: {
          id: number
          load_weight?: number
          continuity_weight?: number
          grade_diff_weight?: number
          pair_same_subject_required?: boolean
          pair_max_grade_diff?: number
          updated_at?: string
        }
        Update: {
          id?: number
          load_weight?: number
          continuity_weight?: number
          grade_diff_weight?: number
          pair_same_subject_required?: boolean
          pair_max_grade_diff?: number
          updated_at?: string
        }
      }
      koma_master: {
        Row: {
          code: '0' | '1' | 'A' | 'B' | 'C'
          koma_order: number
        }
        Insert: {
          code: '0' | '1' | 'A' | 'B' | 'C'
          koma_order: number
        }
        Update: {
          code?: '0' | '1' | 'A' | 'B' | 'C'
          koma_order?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_teacher: {
        Args: {
          p_slot_id: string
          p_teacher_id: string
          p_assigned_by: string
        }
        Returns: {
          slot_id: string
          teacher_id: string
          assigned_by: string
          assigned_at: string
        }[]
      }
      change_teacher: {
        Args: {
          p_slot_id: string
          p_new_teacher_id: string
          p_assigned_by: string
        }
        Returns: {
          slot_id: string
          teacher_id: string
          assigned_by: string
          assigned_at: string
        }[]
      }
      unassign_teacher: {
        Args: {
          p_slot_id: string
          p_assigned_by: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
