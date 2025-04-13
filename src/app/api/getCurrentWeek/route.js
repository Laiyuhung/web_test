import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// 📅 取得今天屬於哪一週（GET）
export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  let { data, error } = await supabase
    .from('schedule_date')
    .select('*')
    .lte('start', today)
    .gte('end', today)
    .single()

  // ⛔ 若查無對應週次，改用 W18 當預設
  if (error || !data) {
    console.warn('⚠️ 查無今天所在週次，回傳 W18 作為預設')

    const fallback = await supabase
      .from('schedule_date')
      .select('*')
      .eq('week', 'W18')
      .single()

    if (fallback.error || !fallback.data) {
      return NextResponse.json({ error: '查無 W18 資料' }, { status: 404 })
    }

    data = fallback.data
  }

  return NextResponse.json({
    week: data.week,
    start: data.start,
    end: data.end
  })
}

// 📥 根據傳入 week 查範圍（POST）
export async function POST(req) {
  const { week } = await req.json()

  const { data, error } = await supabase
    .from('schedule_date')
    .select('start, end')
    .eq('week', week)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '查無週次區間', fallbackWeek: 'W18' }, { status: 404 })
  }

  return NextResponse.json(data)
}
