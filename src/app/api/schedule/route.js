import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  const { team, date } = await req.json()

  console.log('📥 傳入查詢參數:', { team, date })  // ✅ 加這行

  if (!team || !date) {
    return NextResponse.json({ error: '缺少 team 或 date' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cpbl_schedule')
    .select('*')
    .eq('date', date)
    .or(`home.eq.${team},away.eq.${team}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) {
    console.log(`📭 ${team} 在 ${date} 無比賽`)  // ✅ 加這行
    return NextResponse.json({ info: 'No game' })
  }

  const game = data[0]
  const isPostponed = game.is_postponed
  const timeOrPPD = isPostponed ? 'PPD' : game.time

  let info = ''
  if (game.home === team) {
    info = `${timeOrPPD} vs ${game.away}`
  } else {
    info = `${timeOrPPD} @ ${game.home}`
  }

  console.log('📤 回傳比賽資訊:', info)  // ✅ 加這行

  return NextResponse.json({ ...game, info })
}
