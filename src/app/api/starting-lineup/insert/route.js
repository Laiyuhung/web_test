import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const body = await req.json()

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: '缺少打序資料' }, { status: 400 })
    }

    // 驗證欄位格式
    const invalid = body.some(row =>
      !row.date || !row.team || !row.name || !row.batting_no
    )
    if (invalid) {
      return NextResponse.json({ error: '資料欄位不完整' }, { status: 400 })
    }

    // 插入資料
    const { error } = await supabase.from('starting_lineup').insert(body)

    if (error) {
      console.error('❌ Supabase 寫入錯誤:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ API 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
