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

    // 取得台灣時間（UTC+8）
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const taiwan = new Date(utc + 8 * 60 * 60 * 1000);
    const yyyy = taiwan.getFullYear();
    const mm = String(taiwan.getMonth() + 1).padStart(2, '0');
    const dd = String(taiwan.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const { data, error } = await supabase
      .from('waiver')
      .select('*')
      .eq('manager', manager_id)
      .or(`status.eq.pending,off_waiver.gte.${todayStr}`)

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
