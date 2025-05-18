import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET() {
  // 找出曾延期的 game_no
  const { data: postponedGames, error: error1 } = await supabase
    .from('cpbl_schedule')
    .select('game_no')
    .eq('is_postponed', true)

  if (error1) {
    return NextResponse.json({ error: error1.message }, { status: 500 })
  }

  const gameNos = [...new Set(postponedGames.map(row => row.game_no))]

  if (gameNos.length === 0) {
    return NextResponse.json({})
  }

  // 撈出所有同 game_no 的比賽場次
  const { data, error: error2 } = await supabase
    .from('cpbl_schedule')
    .select('*')
    .in('game_no', gameNos)
    .order('date', { ascending: true })

  if (error2) {
    return NextResponse.json({ error: error2.message }, { status: 500 })
  }

  // 整理成 { game_no: [比賽1, 比賽2, ...] }
  const grouped = {}
  for (const row of data) {
    const key = row.game_no
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(row)
  }

  return NextResponse.json(grouped)
}
