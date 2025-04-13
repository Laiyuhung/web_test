import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST() {
  // 取得今天日期（yyyy-mm-dd）
  const today = new Date().toISOString().split('T')[0]

  // 查 schedule 中今天屬於哪一週
  const { data: current } = await supabase
    .from('schedule')
    .select('week, team1, team2, team3, team4')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  // 若查不到週次，預設更新 W18
  const week = current?.week || 'W18'
  const team1 = current?.team1
  const team2 = current?.team2
  const team3 = current?.team3
  const team4 = current?.team4

  if (!team1 || !team2 || !team3 || !team4) {
    return NextResponse.json({ error: '查無有效的隊伍 ID' }, { status: 400 })
  }

  // 取得 managers 對照表
  const { data: managers } = await supabase.from('managers').select('id, team_name')
  const nameToId = Object.fromEntries(managers.map(m => [m.team_name, m.id]))

  // 取得該週的 matchup 結果
  const res = await fetch('https://cpblfantasy.vercel.app/api/weekly_stats_by_manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week })
  })
  const result = await res.json()

  // 建立 manager_id -> 分數對照表
  const scoreMap = Object.fromEntries(
    result.map(t => [nameToId[t.team_name], parseFloat(t.fantasyPoints.Total)])
  )

  // 對應球隊 ID 更新分數
  const updatedScores = {
    score1: scoreMap[team1] || 0,
    score2: scoreMap[team2] || 0,
    score3: scoreMap[team3] || 0,
    score4: scoreMap[team4] || 0,
  }

  await supabase
    .from('schedule')
    .update(updatedScores)
    .eq('week', week)

  return NextResponse.json({ message: `✅ 已更新 ${week} 的比分`, scores: updatedScores })
}
