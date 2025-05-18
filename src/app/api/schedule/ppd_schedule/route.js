// /app/api/schedule/ppd_schedule/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET() {
  // 第一步：找出曾延期的 game_no
  const { data: postponedGames, error: error1 } = await supabase
    .from('cpbl_schedule')
    .select('game_no')
    .eq('is_postponed', true)

  if (error1) {
    return NextResponse.json({ error: error1.message }, { status: 500 })
  }

  const gameNos = [...new Set(postponedGames.map(row => row.game_no))]

  if (gameNos.length === 0) {
    return NextResponse.json([])  // 沒有補賽就直接回傳空陣列
  }

  // 第二步：撈出補賽（含原延期與補賽）
  const { data, error: error2 } = await supabase
    .from('cpbl_schedule')
    .select('*')
    .in('game_no', gameNos)

  if (error2) {
    return NextResponse.json({ error: error2.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
