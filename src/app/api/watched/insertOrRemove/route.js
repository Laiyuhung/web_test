import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  const { manager_id, player_name } = await req.json()
  if (!manager_id || !player_name) {
    return NextResponse.json({ error: '缺少參數' }, { status: 400 })
  }

  // 找出 player_no
  const { data: playerData, error: playerError } = await supabase
    .from('playerslist')
    .select('Player_no')
    .eq('Name', player_name)
    .maybeSingle()

  if (playerError || !playerData) {
    return NextResponse.json({ error: '查無對應球員編號' }, { status: 404 })
  }

  const player_no = playerData.Player_no

  // 檢查是否已在 watched 中
  const { data: exist, error: checkError } = await supabase
    .from('watched')
    .select('*')
    .eq('manager_id', manager_id)
    .eq('player_no', player_no)
    .maybeSingle()

  if (checkError) return NextResponse.json({ error: '查詢失敗' }, { status: 500 })

  if (exist) {
    // 移除
    const { error: deleteError } = await supabase
      .from('watched')
      .delete()
      .eq('manager_id', manager_id)
      .eq('player_no', player_no)

    if (deleteError) return NextResponse.json({ error: '移除失敗' }, { status: 500 })

    return NextResponse.json({ removed: true })
  } else {
    // 新增
    const { error: insertError } = await supabase
      .from('watched')
      .insert({ manager_id, player_no })

    if (insertError) return NextResponse.json({ error: '新增失敗' }, { status: 500 })

    return NextResponse.json({ added: true })
  }
}
