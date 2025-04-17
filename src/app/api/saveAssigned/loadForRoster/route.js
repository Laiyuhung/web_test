import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const manager_id = searchParams.get('manager_id')

  console.log('📥 [loadForRoster] date:', date, 'manager_id:', manager_id)

  if (!date || !manager_id) {
    console.log('❌ 缺少 date 或 manager_id')
    return NextResponse.json({ error: '缺少 date 或 manager_id' }, { status: 400 })
  }

  // Step 1: assigned_position_history
  const { data: assigned, error: assignedError } = await supabase
    .from('assigned_position_history')
    .select('player_name, position')
    .eq('date', date)
    .eq('manager_id', manager_id)

  if (assignedError) {
    console.log('❌ assigned_position_history 錯誤:', assignedError)
    return NextResponse.json({ error: '讀取失敗', detail: assignedError }, { status: 500 })
  }

  console.log('✅ Step 1: assigned_position_history', assigned)

  const playerNames = assigned.map(r => r.player_name)

  // Step 2: playerslist
  const { data: basic, error: basicError } = await supabase
    .from('playerslist')
    .select('Name, Team, B_or_P, identity')
    .in('Name', playerNames)

  if (basicError) {
    console.log('❌ playerslist 錯誤:', basicError)
    return NextResponse.json({ error: 'playerslist 錯誤', detail: basicError }, { status: 500 })
  }
  console.log('✅ Step 2: playerslist', basic)

  // Step 3: player_register_status
  const { data: register, error: registerError } = await supabase
    .from('player_register_status')
    .select('name, status')
    .in('name', playerNames)

  if (registerError) {
    console.log('❌ player_register_status 錯誤:', registerError)
    return NextResponse.json({ error: 'player_register_status 錯誤', detail: registerError }, { status: 500 })
  }
  console.log('✅ Step 3: register_status', register)

  // Step 4: player_position_caculate
  const { data: posData, error: posError } = await supabase
    .from('player_position_caculate')
    .select('name, final_position')
    .in('name', playerNames)

  if (posError) {
    console.log('❌ player_position_caculate 錯誤:', posError)
    return NextResponse.json({ error: 'position_caculate 錯誤', detail: posError }, { status: 500 })
  }
  console.log('✅ Step 4: positionData', posData)

  // Step 5: batting_stats
  const { data: batterStats } = await supabase
    .from('batting_stats')
    .select()
    .eq('game_date', date)
    .in('name', playerNames)
  console.log('✅ Step 5: batterStats', batterStats)

  // Step 6: pitching_stats
  const { data: pitcherStats } = await supabase
    .from('pitching_stats')
    .select()
    .eq('game_date', date)
    .in('name', playerNames)
  console.log('✅ Step 6: pitcherStats', pitcherStats)

  // Step 7: 整合每位球員資料
  const merged = []

  for (const row of assigned) {
    const name = row.player_name

    const base = basic.find(p => p.Name === name) || {}
    const reg = register.find(p => p.name === name) || {}
    const pos = posData.find(p => p.name === name) || {}
    const batter = batterStats.find(s => s.name === name)
    const pitcher = pitcherStats.find(s => s.name === name)

    const stats = batter || pitcher || {}

    const result = {
      name,
      position: row.position,
      team: base.Team || '',
      type: base.B_or_P || '',
      identity: base.identity || '',
      registerStatus: reg.status || '未註冊',
      finalPosition: pos.final_position || [],
      stats
    }

    console.log('🧩 整合:', result)
    merged.push(result)
  }

  return NextResponse.json(merged)
}
