import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const body = await req.json()
  const { apply_time, manager, add_player, off_waiver, drop_player } = body

  if (!apply_time || !manager || !add_player || !off_waiver) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  try {
    // 🔍 先查詢是否已經存在相同申請
    console.log('查詢條件：', { manager, add_player, off_waiver })

    const { data: existing, error: checkError } = await supabase
      .from('waiver')
      .select('apply_no')
      .eq('manager', manager)
      .eq('add_player', add_player)
      .eq('off_waiver', off_waiver)

    if (checkError) {
      console.error('查詢錯誤:', checkError)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '已申請過相同的 Waiver' }, { status: 409 })
    }

    // ✅ 插入資料
    const { error } = await supabase.from('waiver').insert({
      apply_time,
      manager,
      add_player,
      off_waiver,
      drop_player: drop_player || null,
      status: 'pending',
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: '資料庫錯誤' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
