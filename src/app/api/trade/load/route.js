import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { status, manager_id } = await req.json()

    if (!manager_id) {
      return NextResponse.json({ error: '缺少 manager_id' }, { status: 400 })
    }

    const validStatuses = ['pending', 'accepted', 'rejected', 'canceled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: '不合法的 status 篩選值' }, { status: 400 })
    }

    let query = supabase
      .from('trade_discussion')
      .select('*')
      .or(`initiator_id.eq.${manager_id},receiver_id.eq.${manager_id}`)
      .order('created_at', { ascending: false })

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    if (status) {
      if (status === 'pending') {
        query = query.eq('status', 'pending')
      } else {
        query = query.eq('status', status).gte('updated_at', threeDaysAgo)
      }
    } else {
      // ❗如果沒有指定 status，表示要全查：
      // - pending 全部
      // - 其他只要 updated_at >= 3天內
      query = query.or(
        `status.eq.pending,status.in.(accepted,rejected,canceled).and(updated_at.gte.${threeDaysAgo})`
      )
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
