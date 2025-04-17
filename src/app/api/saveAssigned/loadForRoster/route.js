import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const manager_id = searchParams.get('manager_id')

  if (!date || !manager_id) {
    return NextResponse.json({ error: '缺少 date 或 manager_id' }, { status: 400 })
  }

  // 1. 撈出當日該玩家的陣容紀錄
  const { data: assigned, error: assignedError } = await supabase
    .from('assigned_position_history')
    .select('player_name, position')
    .eq('date', date)
    .eq('manager_id', manager_id)

  if (assignedError) {
    return NextResponse.json({ error: '讀取 assigned_position_history 失敗', detail: assignedError }, { status: 500 })
  }

  const playerNames = assigned.map(r => r.player_name)

  // 2~6. 平行撈取所有額外資訊
  const [{ data: basic, error: basicError }, 
         { data: register, error: registerError },
         { data: positionData, error: posError },
         { data: batterStats },
         { data: pitcherStats }] = await Promise.all([
    supabase.from('playerslist').select('Name, Team, B_or_P, identity').in('Name', playerNames),
    supabase.from('player_register_status').select('name, status').in('name', playerNames),
    supabase.from('player_position_caculate').select('name, final_position').in('name', playerNames),
    supabase.from('batting_stats').select().eq('game_date', date).in('name', playerNames),
    supabase.from('pitching_stats').select().eq('game_date', date).in('name', playerNames),
  ])

  if (basicError || registerError || posError) {
    return NextResponse.json({
      error: '資料讀取失敗',
      details: { basicError, registerError, posError }
    }, { status: 500 })
  }

  const merged = assigned.map(row => {
    const name = row.player_name

    const base = basic.find(p => p.Name === name) || {}
    const reg = register.find(r => r.name === name)
    const pos = positionData.find(p => p.name === name)
    const batter = batterStats.find(s => s.name === name)
    const pitcher = pitcherStats.find(s => s.name === name)

    const stats = batter || pitcher || {}

    return {
      name,
      position: row.position,
      team: base.Team || '',
      type: base.B_or_P || '',
      identity: base.identity || '',
      registerStatus: reg?.status || '未註冊',
      finalPosition: pos?.final_position || [],
      stats
    }
  })

  return NextResponse.json(merged)
}
