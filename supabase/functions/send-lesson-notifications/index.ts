import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 曜日の日本語ラベル
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']

// コマIDから表示名へのマップ
const KOMA_LABEL: Record<string, string> = {
  '0': '0コマ',
  '1': '1コマ',
  'A': 'Aコマ',
  'B': 'Bコマ',
  'C': 'Cコマ',
}

function formatTime(time: string): string {
  // "17:10:00" → "17:10"
  return time.slice(0, 5)
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = WEEKDAY_JA[date.getDay()]
  return `${y}年${m}月${d}日（${w}）`
}

interface LessonRow {
  time_slot_id: string
  start_time: string
  end_time: string
  teacher_name: string
  teacher_email: string
}

interface TeacherSchedule {
  name: string
  email: string
  lessons: Array<{ komaLabel: string; startTime: string; endTime: string }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Bearer トークンによる認証
  const authHeader = req.headers.get('Authorization')
  const expectedToken = Deno.env.get('NOTIFICATION_BEARER_TOKEN')
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 今日の日付（JST = UTC+9）
  const nowUtc = new Date()
  const nowJst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = nowJst.toISOString().slice(0, 10) // "YYYY-MM-DD"
  const todayDate = new Date(todayStr + 'T00:00:00+09:00')

  // 当日の授業を取得（講師のメールアドレスがある場合のみ）
  const { data: rows, error } = await supabase
    .from('assignments')
    .select(`
      time_slot_id,
      time_slots!inner (
        id,
        start_time,
        end_time
      ),
      teachers!inner (
        name,
        users!inner (
          email
        )
      )
    `)
    .eq('date', todayStr)
    .not('teachers.user_id', 'is', null)

  if (error) {
    console.error('DB query error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!rows || rows.length === 0) {
    console.log(`[${todayStr}] No assignments found.`)
    return new Response(JSON.stringify({ message: '本日の授業はありません', date: todayStr }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 講師ごとにグルーピング
  const teacherMap = new Map<string, TeacherSchedule>()

  for (const row of rows as any[]) {
    const email: string = row.teachers?.users?.email
    const name: string = row.teachers?.name
    const timeSlotId: string = row.time_slot_id
    const startTime: string = row.time_slots?.start_time
    const endTime: string = row.time_slots?.end_time

    if (!email || !name) continue

    if (!teacherMap.has(email)) {
      teacherMap.set(email, { name, email, lessons: [] })
    }

    const schedule = teacherMap.get(email)!
    // 同じコマの重複を除く（1:2の場合、position 1と2で同じコマが2行になる）
    const alreadyAdded = schedule.lessons.some(l => l.komaLabel === (KOMA_LABEL[timeSlotId] ?? timeSlotId))
    if (!alreadyAdded) {
      schedule.lessons.push({
        komaLabel: KOMA_LABEL[timeSlotId] ?? timeSlotId,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
      })
    }
  }

  // コマ順にソート（display_orderが取れないためIDで代用: 0,1,A,B,C順）
  const komaOrder = ['0', '1', 'A', 'B', 'C']
  for (const schedule of teacherMap.values()) {
    schedule.lessons.sort((a, b) => {
      const ai = komaOrder.findIndex(k => KOMA_LABEL[k] === a.komaLabel)
      const bi = komaOrder.findIndex(k => KOMA_LABEL[k] === b.komaLabel)
      return ai - bi
    })
  }

  const dateLabel = formatDate(todayDate)
  const results: string[] = []

  for (const schedule of teacherMap.values()) {
    const lessonLines = schedule.lessons
      .map(l => `  ${l.komaLabel}（${l.startTime}〜${l.endTime}）`)
      .join('\n')

    const emailBody = `${schedule.name}先生

本日の担当授業をお知らせします。

■ ${dateLabel}
${lessonLines}

※このメールは自動送信です。
※ご不明な点は管理者にお問い合わせください。`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KomaFit <noreply@komafit.jp>',
        to: schedule.email,
        subject: `【KomaFit】本日の授業のお知らせ（${dateLabel}）`,
        text: emailBody,
      }),
    })

    if (res.ok) {
      console.log(`✅ Sent to ${schedule.email}`)
      results.push(`OK: ${schedule.email}`)
    } else {
      const errText = await res.text()
      console.error(`❌ Failed to send to ${schedule.email}:`, errText)
      results.push(`NG: ${schedule.email} - ${errText}`)
    }
  }

  return new Response(
    JSON.stringify({
      date: todayStr,
      notified: teacherMap.size,
      results,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
