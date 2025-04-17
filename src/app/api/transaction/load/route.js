import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const { mode } = await req.json()
  const limit = mode === 'recent' ? 5 : null

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_time', { ascending: false })
    .limit(limit ?? undefined)

  if (error) {
    console.error('❌ Supabase 讀取失敗:', error)
    return NextResponse.json({ error: '資料讀取失敗' }, { status: 500 })
  }

  const { data: managerData } = await supabase
    .from('managers')
    .select('id, team_name')

  const managerMap = Object.fromEntries(managerData.map(m => [String(m.id), m.team_name]))

  const { data: playerData } = await supabase
    .from('playerslist')
    .select('Player_no, Name')

  const playerMap = Object.fromEntries(playerData.map(p => [p.Player_no, p.Name]))

  const mapped = data.map(row => ({
    type: row.type,
    transaction_time: row.transaction_time,
    player_name: playerMap[row.Player_no] || row.Player_no,
    manager: managerMap[row.manager_id] || row.manager_id
  }))

  return NextResponse.json(mapped)
}
