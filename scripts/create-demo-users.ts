/**
 * Create Demo Users Script
 *
 * This script creates demo users using Supabase Admin API
 * Run with: npx tsx scripts/create-demo-users.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
// Service role key for local development (from supabase start output)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const demoUsers = [
  {
    email: 'admin@example.com',
    password: 'password123',
    user_metadata: {
      role: 'admin',
      name: '管理者ユーザー'
    },
    email_confirm: true
  },
  {
    email: 'teacher@example.com',
    password: 'password123',
    user_metadata: {
      role: 'teacher',
      name: '講師ユーザー'
    },
    email_confirm: true
  },
  {
    email: 'viewer@example.com',
    password: 'password123',
    user_metadata: {
      role: 'viewer',
      name: '閲覧者ユーザー'
    },
    email_confirm: true
  }
]

async function createDemoUsers() {
  console.log('Creating demo users...\n')

  for (const userData of demoUsers) {
    try {
      // Check if user already exists in auth.users
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
      const authUserExists = existingAuthUsers.users.some(u => u.email === userData.email)

      if (authUserExists) {
        console.log(`✓ User ${userData.email} already exists in auth.users`)
        continue
      }

      // Delete from public.users if exists (cleanup from previous reset)
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('email', userData.email)

      // Create user using Admin API
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: userData.email_confirm,
        user_metadata: userData.user_metadata
      })

      if (error) {
        console.error(`✗ Error creating user ${userData.email}:`, error.message)
        continue
      }

      if (data.user) {
        console.log(`✓ Created auth user: ${userData.email}`)

        // Create corresponding entry in public.users table
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            email: userData.email,
            name: userData.user_metadata.name,
            role: userData.user_metadata.role,
            password_hash: '$2a$10$placeholder' // Placeholder, not used for auth
          })

        if (insertError) {
          console.error(`✗ Error creating public.users entry for ${userData.email}:`, insertError.message)
        } else {
          console.log(`✓ Created public.users entry: ${userData.email}`)
        }
      }
    } catch (err) {
      console.error(`✗ Unexpected error for ${userData.email}:`, err)
    }

    console.log('')
  }

  console.log('Demo users creation completed!')
}

createDemoUsers().catch(console.error)
