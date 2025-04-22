import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { status } = await req.json()

    const validStatuses = ['pending', 'accepted', 'rejected', 'canceled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: '不合法的 status 篩選值' }, { status: 400 })
    }

    const query = supabase
      .from('trade_discussion')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 查詢失敗:', error)
      return NextResponse.json({ error: '查詢失敗', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ trades: data })
  } catch (err) {
    console.error('❌ 系統錯誤:', err)
    return NextResponse.json({ error: '內部錯誤', detail: err.message }, { status: 500 })
  }
}
