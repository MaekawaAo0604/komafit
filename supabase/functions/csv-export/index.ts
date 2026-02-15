import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Convert data to CSV format
function toCSV(data: Record<string, any>[]): string {
  if (data.length === 0) {
    return ''
  }

  // Get headers from first row
  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')

  // Convert rows to CSV
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Escape commas and quotes
      if (value === null || value === undefined) {
        return ''
      }
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

// Get current timestamp for filename
function getTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dataType } = await req.json()

    if (!dataType) {
      return new Response(
        JSON.stringify({ error: 'データ種別が指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch data based on type
    let query = supabase.from(dataType).select('*')

    // Add specific queries for each data type
    switch (dataType) {
      case 'teachers':
        query = supabase.from('teachers').select('id, name, active, cap_week_slots, cap_students, allow_pair')
        break
      case 'students':
        query = supabase.from('students').select('id, name, grade, active')
        break
      case 'slots':
        query = supabase.from('slots').select('id, day, koma_code')
        break
      case 'teacher_availability':
        query = supabase.from('teacher_availability').select('teacher_id, slot_id, is_available')
        break
      case 'slot_teacher':
        query = supabase.from('slot_teacher').select('slot_id, position, teacher_id, assigned_at')
        break
      default:
        return new Response(
          JSON.stringify({ error: `未対応のデータ種別: ${dataType}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return new Response(
        JSON.stringify({ error: `データの取得に失敗しました: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'エクスポートするデータが見つかりません' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert to CSV
    const csv = toCSV(data)

    // Generate filename with timestamp
    const timestamp = getTimestamp()
    const filename = `${dataType}_${timestamp}.csv`

    // Record audit log
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'CSV_EXPORT',
          payload: {
            data_type: dataType,
            row_count: data.length,
            filename
          }
        })
      }
    }

    // Return CSV file
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
