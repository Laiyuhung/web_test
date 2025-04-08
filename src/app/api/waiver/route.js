import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req) {
  const supabase = createClient()
  const body = await req.json()
  const { apply_time, manager, add_player, off_waiver, drop_player } = body

  if (!apply_time || !manager || !add_player || !off_waiver) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  try {
    const { error } = await supabase.from('waiver').insert({
      apply_time,
      manager,
      add_player,
      off_waiver,
      drop_player: drop_player || null,
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
