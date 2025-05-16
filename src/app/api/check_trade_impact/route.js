import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { manager_id, playerName } = await req.json()

    if (!manager_id || !playerName) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 })
    }

    const { data: trades, error } = await supabase
      .from('trade_discussion')
      .select('*')
      .or(`initiator_id.eq.${manager_id},receiver_id.eq.${manager_id}`)
      .eq('status', 'pending')

    if (error) throw new Error(`讀取 trade_discussion 失敗：${error.message}`)

    const targetsToCancel = trades.filter(t =>
      (Array.isArray(t.initiator_received) && t.initiator_received.includes(playerName)) ||
      (Array.isArray(t.receiver_received) && t.receiver_received.includes(playerName))
    )

    if (targetsToCancel.length === 0) {
      return NextResponse.json({ message: '無受影響的交易' })
    }

    const updates = await Promise.all(
      targetsToCancel.map(t =>
        supabase
          .from('trade_discussion')
          .update({ status: 'auto_canceled' })
          .eq('id', t.id)
      )
    )

    return NextResponse.json({
      message: `成功取消 ${updates.length} 筆交易`,
      canceled_ids: targetsToCancel.map(t => t.id),
    })
  } catch (err) {
    console.error('❌ 檢查交易失敗:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
