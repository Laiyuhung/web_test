import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { text, date } = await req.json()

    if (!text || !date) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    const records = lines.map((line, i) => {
      const parts = line.split(/\s+/)
      if (parts.length < 3) {
        console.warn(`⚠️ 第 ${i + 1} 行格式不正確：`, line)
        return null
      }

      const name = parts[0]
      const action = parts[2] // 只取異動事件

      return {
        name,
        action,
        move_date: date
      }
    }).filter(r => r !== null)

    // ✅ 先刪除該日期的舊資料
    const { error: deleteError } = await supabase
      .from('player_movements')
      .delete()
      .eq('move_date', date)

    if (deleteError) {
      console.error('❌ 刪除舊資料錯誤:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // ✅ 再插入新資料
    const { error: insertError } = await supabase
      .from('player_movements')
      .insert(records)

    if (insertError) {
      console.error('❌ 插入新資料錯誤:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ API 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
