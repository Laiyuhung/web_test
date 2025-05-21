import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  return await POST(req)
}

export async function POST(req) {
  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')?.trim()  // ← 這裡抓參數

  const today = new Date().toISOString().split('T')[0]

  // 查 schedule 中今天屬於哪一週
  const { data: current } = await supabase
    .from('schedule')
    .select('week, team1, team2, team3, team4')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  const cleanWeek = weekParam || current?.week || 'W18'  // ← 用指定週，沒有就 fallback

  const team1 = current?.team1
  const team2 = current?.team2
  const team3 = current?.team3
  const team4 = current?.team4

  if (!team1 || !team2 || !team3 || !team4) {
    return NextResponse.json({ error: '查無有效的隊伍 ID' }, { status: 400 })
  }

  const { data: managers } = await supabase.from('managers').select('id, team_name')
  const nameToId = Object.fromEntries(managers.map(m => [m.team_name, m.id]))

  const res = await fetch('https://cpblfantasy.vercel.app/api/weekly_stats_by_manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week: cleanWeek })
  })
  const result = await res.json()

  const scoreMap = Object.fromEntries(
    result.map(t => [nameToId[t.team_name], parseFloat(t.fantasyPoints.Total)])
  )

  const updatedScores = {
    score1: scoreMap[team1] || 0,
    score2: scoreMap[team2] || 0,
    score3: scoreMap[team3] || 0,
    score4: scoreMap[team4] || 0,
  }

  await supabase
    .from('schedule')
    .update(updatedScores)
    .eq('week', current.week)

  return NextResponse.json({
    message: `✅ 已更新 ${current.week} 的比分（使用 ${cleanWeek} 的統計）`,
    scores: updatedScores,
  })
}
