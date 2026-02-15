import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationError {
  row: number
  field: string
  message: string
}

// Parse CSV data
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row)
  }

  return rows
}

// Validate CSV rows based on data type
function validateRows(
  rows: Record<string, string>[],
  dataType: string
): ValidationError[] {
  const errors: ValidationError[] = []

  rows.forEach((row, index) => {
    const rowNum = index + 2 // +2 for header row and 0-based index

    switch (dataType) {
      case 'teachers':
        if (!row.name) {
          errors.push({ row: rowNum, field: 'name', message: '講師名は必須です' })
        }
        if (!row.cap_week_slots || isNaN(Number(row.cap_week_slots))) {
          errors.push({ row: rowNum, field: 'cap_week_slots', message: '週あたりの上限コマ数は数値である必要があります' })
        }
        break

      case 'students':
        if (!row.name) {
          errors.push({ row: rowNum, field: 'name', message: '生徒名は必須です' })
        }
        if (!row.grade || isNaN(Number(row.grade))) {
          errors.push({ row: rowNum, field: 'grade', message: '学年は数値である必要があります' })
        }
        break

      default:
        errors.push({ row: rowNum, field: '', message: `未対応のデータ種別: ${dataType}` })
    }
  })

  return errors
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const dataType = formData.get('dataType') as string

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'ファイルが指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!dataType) {
      return new Response(
        JSON.stringify({ error: 'データ種別が指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse CSV
    const csvText = await file.text()
    const rows = parseCSV(csvText)

    // Validate rows
    const errors = validateRows(rows, dataType)
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insert data
    const { data, error } = await supabase
      .from(dataType)
      .upsert(rows)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(
        JSON.stringify({ error: `データの挿入に失敗しました: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record audit log
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'CSV_IMPORT',
          payload: {
            data_type: dataType,
            row_count: rows.length
          }
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: rows.length,
        message: `${rows.length}件のデータをインポートしました`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
