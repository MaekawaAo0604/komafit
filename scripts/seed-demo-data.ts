/**
 * Seed Demo Data Script
 *
 * Creates demo teachers and students for testing
 * Run with: npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Get teacher user ID (created by create-demo-users.ts)
async function getTeacherUserId(): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'teacher@example.com')
    .single()

  return data?.id || '22222222-2222-2222-2222-222222222222'
}

const demoTeachers = [
  { name: '田中太郎', cap_week_slots: 15, cap_students: 20, allow_pair: true },
  { name: '佐藤花子', cap_week_slots: 12, cap_students: 18, allow_pair: true },
  { name: '鈴木一郎', cap_week_slots: 10, cap_students: 15, allow_pair: false },
  { name: '高橋美咲', cap_week_slots: 14, cap_students: 20, allow_pair: true },
  { name: '渡辺健太', cap_week_slots: 12, cap_students: 16, allow_pair: true },
]

const demoStudents = [
  { name: '山田太郎', grade: 8 }, // 中2
  { name: '伊藤花子', grade: 9 }, // 中3
  { name: '中村健太', grade: 7 }, // 中1
  { name: '小林美咲', grade: 8 }, // 中2
  { name: '加藤翔太', grade: 9 }, // 中3
  { name: '吉田さくら', grade: 7 }, // 中1
  { name: '山本大輔', grade: 8 }, // 中2
  { name: '松本彩', grade: 9 }, // 中3
  { name: '井上隼人', grade: 7 }, // 中1
  { name: '木村あかり', grade: 8 }, // 中2
]

async function seedDemoData() {
  console.log('Seeding demo data...\n')

  const teacherUserId = await getTeacherUserId()

  // Create teachers
  console.log('Creating teachers...')
  for (const teacher of demoTeachers) {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .insert({
          user_id: teacher.name === '田中太郎' ? teacherUserId : null,
          name: teacher.name,
          active: true,
          cap_week_slots: teacher.cap_week_slots,
          cap_students: teacher.cap_students,
          allow_pair: teacher.allow_pair,
        })
        .select()
        .single()

      if (error) {
        console.error(`✗ Error creating teacher ${teacher.name}:`, error.message)
      } else {
        console.log(`✓ Created teacher: ${teacher.name}`)
      }
    } catch (err) {
      console.error(`✗ Unexpected error for teacher ${teacher.name}:`, err)
    }
  }

  console.log('')

  // Create students
  console.log('Creating students...')
  for (const student of demoStudents) {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          name: student.name,
          grade: student.grade,
          active: true,
        })
        .select()
        .single()

      if (error) {
        console.error(`✗ Error creating student ${student.name}:`, error.message)
      } else {
        console.log(`✓ Created student: ${student.name}`)
      }
    } catch (err) {
      console.error(`✗ Unexpected error for student ${student.name}:`, err)
    }
  }

  console.log('\nDemo data seeding completed!')
}

seedDemoData().catch(console.error)
