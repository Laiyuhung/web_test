import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const { mode } = await req.json()

  const limit = mode === 'recent' ? 20 : null

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_time', { ascending: false })
    .limit(limit ?? undefined)

  if (error) {
    console.error('❌ Supabase 讀取失敗:', error)
    return NextResponse.json({ error: '資料讀取失敗' }, { status: 500 })
  }

  const merged = []
  let i = 0

  while (i < data.length) {
    const current = data[i]

    // 若是 Trade，合併連續的所有 Trade
    if (current.type === 'Trade') {
      const tradeGroup = []
      while (i < data.length && data[i].type === 'Trade') {
        tradeGroup.push(data[i])
        i++
      }

      merged.push({
        type: 'TradeGroup',
        transaction_time: tradeGroup[0].transaction_time,
        summary: `🔁 交易合併事件（共 ${tradeGroup.length} 筆）` +
          tradeGroup.map(t => `｜${t.details || `${t.type} ${t.player_id}`}`).join(' ')
      })
    } else {
      // 非 Trade 單筆處理
      merged.push({
        type: current.type,
        transaction_time: current.transaction_time,
        summary: `${current.type} 玩家 ${current.player_id}`
      })
      i++
    }

    if (mode === 'recent' && merged.length >= 5) break
  }

  return NextResponse.json(merged)
}
