import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { week } = await req.json()
    if (!week) return NextResponse.json({ error: '缺少 week 參數' }, { status: 400 })

    const { data: weekData } = await supabase
      .from('schedule_date')
      .select('*')
      .eq('week', week)
      .single()

    if (!weekData) return NextResponse.json({ error: '查無週次資料' }, { status: 404 })

    const { start, end } = weekData

    const { data: assigned } = await supabase
      .from('assigned_position_history')
      .select('*')
      .gte('date', start)
      .lte('date', end)

    const starters = assigned.filter(row => !['BN', 'NA', 'NA(備用)'].includes(row.position))

    const playerMap = {}
    for (const row of starters) {
      if (!playerMap[row.manager_id]) playerMap[row.manager_id] = {}
      if (!playerMap[row.manager_id][row.player_name]) playerMap[row.manager_id][row.player_name] = new Set()
      playerMap[row.manager_id][row.player_name].add(row.date)
    }

    const allNames = [...new Set(starters.map(s => s.player_name))]

    const { data: playerTypes } = await supabase
      .from('playerslist')
      .select('Name, B_or_P')
      .in('Name', allNames)

    const typeMap = Object.fromEntries(playerTypes.map(p => [p.Name, p.B_or_P]))

    const { data: batStats } = await supabase
      .from('batting_stats')
      .select('*')
      .gte('game_date', start)
      .lte('game_date', end)
      .eq('is_major', true)

    const { data: pitStats } = await supabase
      .from('pitching_stats')
      .select('*')
      .gte('game_date', start)
      .lte('game_date', end)
      .eq('is_major', true)

    const allManagerIds = [1, 2, 3, 4]

    for (const managerId of allManagerIds) {
      const players = playerMap[managerId] || {}

      for (const [name, dates] of Object.entries(players)) {
        const isBatter = typeMap[name] === 'Batter'
        const isPitcher = typeMap[name] === 'Pitcher'

        for (const date of dates) {
          console.log(`📅 ${date} ➜ Manager ${managerId} 登錄 ${name}，類型: ${isBatter ? 'Batter' : isPitcher ? 'Pitcher' : '未知'}`)

          if (isBatter) {
            const rows = batStats.filter(r => r.name === name && r.game_date === date)
            console.log(`🔍 ${name} @ ${date} 打者原始數據:`, rows)
          }

          if (isPitcher) {
            const rows = pitStats.filter(r => r.name === name && r.game_date === date)
            console.log(`🔍 ${name} @ ${date} 投手原始數據:`, rows)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ weekSummary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
