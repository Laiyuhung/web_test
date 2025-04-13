import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST() {
  // 取得隊名與 id 對照表
  const { data: managers } = await supabase.from('managers').select('id, team_name')
  const nameToId = Object.fromEntries(managers.map(m => [m.team_name, m.id]))

  // 取得目前的 schedule（含 team1~4）
  const { data: schedules } = await supabase.from('schedule').select('week, team1, team2, team3, team4')

  for (const row of schedules) {
    const { week, team1, team2, team3, team4 } = row

    const res = await fetch('https://cpblfantasy.vercel.app/api/weekly_stats_by_manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week })
    })

    const result = await res.json()

    // team_name → Total 分數 map
    const scoreMap = Object.fromEntries(
      result.map(t => [nameToId[t.team_name], parseFloat(t.fantasyPoints.Total)])
    )

    // 對應球隊 ID 找出對應的總分
    const updatedScores = {
      score1: scoreMap[team1] || 0,
      score2: scoreMap[team2] || 0,
      score3: scoreMap[team3] || 0,
      score4: scoreMap[team4] || 0,
    }

    // 更新 schedule 表中該週的分數
    await supabase
      .from('schedule')
      .update(updatedScores)
      .eq('week', week)
  }

  return NextResponse.json({ message: '賽程表分數更新完成 ✅' })
}
