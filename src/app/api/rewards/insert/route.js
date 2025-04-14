import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { manager, event, awards } = await req.json()

    console.log('📥 收到資料:', { manager, event, awards })

    if (!manager || !event || awards === undefined) {
      console.warn('⚠️ 缺少必要欄位')
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const { error } = await supabase.from('rewards').insert([
      {
        manager_id: parseInt(manager, 10),
        event,
        awards: parseInt(awards, 10),
      },
    ])

    if (error) {
      console.error('❌ insert rewards 失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ insert 成功')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ POST 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
