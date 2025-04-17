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

    const result = []
    const allManagerIds = [1, 2, 3, 4]

    for (const managerId of allManagerIds) {
      const players = playerMap[managerId] || {}
      const batterSum = { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0 }
      const pitcherSum = { OUT: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0 }

      for (const [name, dates] of Object.entries(players)) {
        const isBatter = typeMap[name] === 'Batter'
        const isPitcher = typeMap[name] === 'Pitcher'

        for (const date of dates) {
          console.log(`\n📅 ${date} ➕ Manager ${managerId} 加入 ${name} (${isBatter ? 'Batter' : 'Pitcher'})`)

          if (isBatter) {
            const rows = batStats.filter(r => r.name === name && r.game_date === date)
            if (rows.length === 0) console.log(`🈳 無打者數據`)
            for (const r of rows) {
              const before = { ...batterSum }
              batterSum.AB += r.at_bats || 0
              batterSum.R += r.runs || 0
              batterSum.H += r.hits || 0
              batterSum.HR += r.home_runs || 0
              batterSum.RBI += r.rbis || 0
              batterSum.SB += r.stolen_bases || 0
              batterSum.K += r.strikeouts || 0
              batterSum.BB += r.walks || 0
              batterSum.GIDP += r.double_plays || 0
              batterSum.XBH += (r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0)
              const singles = (r.hits || 0) - ((r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0))
              batterSum.TB += singles + (r.doubles || 0) * 2 + (r.triples || 0) * 3 + (r.home_runs || 0) * 4
              console.log('🟦 加總變化:', Object.keys(before).reduce((acc, key) => {
                acc[key] = `${before[key]} ➜ ${batterSum[key]}`
                return acc
              }, {}))
            }
          }

          if (isPitcher) {
            const rows = pitStats.filter(r => r.name === name && r.game_date === date)
            if (rows.length === 0) console.log(`🈳 無投手數據`)
            for (const r of rows) {
              const before = { ...pitcherSum }
              const ip = r.innings_pitched || 0
              const outs = Math.floor(ip) * 3 + Math.round((ip % 1) * 10)
              pitcherSum.OUT += outs
              pitcherSum.H += r.hits_allowed || 0
              pitcherSum.ER += r.earned_runs || 0
              pitcherSum.K += r.strikeouts || 0
              pitcherSum.BB += r.walks || 0
              if (r.record === 'W') pitcherSum.W += 1
              if (r.record === 'L') pitcherSum.L += 1
              if (r.record === 'H') pitcherSum.HLD += 1
              if (r.record === 'S') pitcherSum.SV += 1
              if (ip >= 6 && r.earned_runs <= 3) pitcherSum.QS += 1
              console.log('🟥 加總變化:', Object.keys(before).reduce((acc, key) => {
                acc[key] = `${before[key]} ➜ ${pitcherSum[key]}`
                return acc
              }, {}))
            }
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
