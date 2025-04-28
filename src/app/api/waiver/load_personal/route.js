// app/api/waiver/load_personal/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const body = await req.json()
    const { manager_id } = body

    if (!manager_id) {
      return NextResponse.json({ error: '缺少 manager_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('waiver')
      .select('*')
      .eq('manager', manager_id)
      .eq('status', 'pending')

    if (error) {
      console.error('❌ 查詢失敗:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ 伺服器錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
