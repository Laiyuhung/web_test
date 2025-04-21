import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  const { manager_id } = await req.json()
  if (!manager_id) {
    return NextResponse.json({ error: '缺少參數' }, { status: 400 })
  }

  // 撈 watched 列表
  const { data: watchedList, error } = await supabase
    .from('watched')
    .select('player_no')
    .eq('manager_id', manager_id)

  if (error) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const playerNos = watchedList.map(w => w.player_no)

  // 撈出名稱
  const { data: playerNames } = await supabase
    .from('playerslist')
    .select('Player_no, Name')
    .in('Player_no', playerNos)

  return NextResponse.json(playerNames)
}
