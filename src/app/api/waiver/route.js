import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const body = await req.json()
  const { apply_time, manager, add_player, off_waiver, drop_player } = body

  if (!apply_time || !manager || !add_player || !off_waiver) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  try {
    

    // 📌 查目前 priority 最大值
    const { data: priorityData, error: priorityError } = await supabase
      .from('waiver')
      .select('personal_priority')
      .eq('manager', manager)
      .eq('off_waiver', off_waiver)

    if (priorityError) {
      console.error('查詢 priority 錯誤:', priorityError)
      return NextResponse.json({ error: '查詢 priority 失敗' }, { status: 500 })
    }

    let newPriority = 1
    if (priorityData.length > 0) {
      const max = Math.max(...priorityData.map(r => r.personal_priority || 0)) // ✅
      newPriority = max + 1
    }

    // ✅ 插入新的 Waiver 資料
    const { error: insertError } = await supabase.from('waiver').insert({
      apply_time,
      manager,
      add_player,
      off_waiver,
      drop_player: drop_player || null,
      personal_priority: newPriority,
      status: 'pending',
    })

    if (insertError) {
      console.error('插入失敗:', insertError)
      return NextResponse.json({ error: '資料庫寫入錯誤' }, { status: 500 })
    }

    return NextResponse.json({ success: true, priority: newPriority })
  } catch (e) {
    console.error('Unhandled error:', e)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
