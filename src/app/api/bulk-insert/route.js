// ✅ /app/api/bulk-insert/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { text, date, isMajor } = await req.json()

    if (!text || !date || typeof isMajor !== 'boolean') {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)

    const records = lines.map((line, index) => ({
      raw_text: line,
      date,
      is_major: isMajor,
      order: index + 1,
    }))

    const { error } = await supabase.from('raw_stats').insert(records)

    if (error) {
      console.error('❌ Supabase insert 錯誤:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ API 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
