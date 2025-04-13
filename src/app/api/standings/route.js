import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { type } = await req.json()

    if (!['firstHalf', 'secondHalf', 'season'].includes(type)) {
      return NextResponse.json({ error: 'type 無效' }, { status: 400 })
    }

    // 決定週次範圍
    const weeks = {
      firstHalf: Array.from({ length: 9 }, (_, i) => `W${i + 1}`),
      secondHalf: Array.from({ length: 9 }, (_, i) => `W${i + 10}`),
      season: Array.from({ length: 18 }, (_, i) => `W${i + 1}`),
    }[type]

    // 撈對應週次的 schedule
    const { data: schedules, error } = await supabase
      .from('schedule')
      .select('*')
      .in('week', weeks)

    if (error) {
      console.error('❌ 讀取 schedule 錯誤:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 統計 manager_id => 總分
    const scoreMap = {}

    for (const s of schedules) {
      const pairs = [
        [s.team1, s.score1],
        [s.team2, s.score2],
        [s.team3, s.score3],
        [s.team4, s.score4],
      ]
      for (const [id, score] of pairs) {
        if (!scoreMap[id]) scoreMap[id] = 0
        scoreMap[id] += score ?? 0
      }
    }

    // 撈出所有隊名
    const { data: managers } = await supabase.from('managers').select('id, team_name')
    const idToName = Object.fromEntries(managers.map(m => [m.id, m.team_name]))

    // 整理結果：回傳 id, team_name, type_points
    const result = Object.entries(scoreMap).map(([id, total]) => ({
      id: parseInt(id),
      team_name: idToName[id] || '(未知隊伍)',
      [`${type}_points`]: total,
    }))

    // 依照分數排序（高分在前）
    result.sort((a, b) => b[`${type}_points`] - a[`${type}_points`])

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ API 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
