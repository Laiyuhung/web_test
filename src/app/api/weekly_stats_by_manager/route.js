import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { week } = await req.json()
    if (!week) return NextResponse.json({ error: '缺少 week 參數' }, { status: 400 })

    const { data: weekData, error: weekError } = await supabase
      .from('schedule_date')
      .select('*')
      .eq('week', week)
      .single()

    if (weekError || !weekData) {
      return NextResponse.json({ error: '查無週次資料' }, { status: 404 })
    }

    const { start, end } = weekData

    const { data: assigned, error: assignErr } = await supabase
      .from('assigned_position_history')
      .select('*')
      .gte('date', start)
      .lte('date', end)

    if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 })

    const starters = assigned.filter(row => !['BN', 'NA', 'NA(備用)'].includes(row.position))

    const playerMap = {} // manager_id => Set of {name, dates[]}
    for (const row of starters) {
      const key = row.manager_id
      if (!playerMap[key]) playerMap[key] = {}
      if (!playerMap[key][row.player_name]) playerMap[key][row.player_name] = new Set()
      playerMap[key][row.player_name].add(row.date)
    }

    const allNames = [...new Set(starters.map(s => s.player_name))]

    const { data: playerTypes, error: typeErr } = await supabase
      .from('playerslist')
      .select('Name, B_or_P')
      .in('Name', allNames)

    if (typeErr) return NextResponse.json({ error: typeErr.message }, { status: 500 })

    const typeMap = Object.fromEntries(playerTypes.map(p => [p.Name, p.B_or_P]))

    const { data: batStats } = await supabase
      .from('batting_stats')
      .select('*')
      .gte('game_date', start)
      .lte('game_date', end)

    const { data: pitStats } = await supabase
      .from('pitching_stats')
      .select('*')
      .gte('game_date', start)
      .lte('game_date', end)

    const result = []
    for (const [managerId, players] of Object.entries(playerMap)) {
      const batterSum = {
        AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0,
        K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0, AVG: 0, OPS: 0
      }
      const pitcherSum = {
        OUT: 0, W: 0, L: 0, HLD: 0, SV: 0,
        H: 0, ER: 0, K: 0, BB: 0, QS: 0, ERA: 0, WHIP: 0
      }

      for (const [name, dates] of Object.entries(players)) {
        const isBatter = typeMap[name] === 'Batter'
        const isPitcher = typeMap[name] === 'Pitcher'

        for (const date of dates) {
          if (isBatter) {
            const rows = batStats.filter(r => r.name === name && r.game_date === date)
            for (const r of rows) {
              batterSum.AB += r.at_bats || 0
              batterSum.R += r.runs || 0
              batterSum.H += r.hits || 0
              batterSum.HR += r.home_runs || 0
              batterSum.RBI += r.runs_batted_in || 0
              batterSum.SB += r.stolen_bases || 0
              batterSum.K += r.strikeouts || 0
              batterSum.BB += r.walks || 0
              batterSum.GIDP += r.ground_into_double_play || 0
              batterSum.XBH += (r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0)
              batterSum.TB += (r.singles || 0) + (r.doubles || 0)*2 + (r.triples || 0)*3 + (r.home_runs || 0)*4
            }
          }

          if (isPitcher) {
            const rows = pitStats.filter(r => r.name === name && r.game_date === date)
            for (const r of rows) {
              const rawIP = r.innings_pitched || 0
              const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)
              pitcherSum.OUT += outs
              pitcherSum.H += r.hits_allowed || 0
              pitcherSum.ER += r.earned_runs || 0
              pitcherSum.K += r.strikeouts || 0
              pitcherSum.BB += r.walks || 0
              if (r.record === 'W') pitcherSum.W += 1
              if (r.record === 'L') pitcherSum.L += 1
              if (r.record === 'HLD') pitcherSum.HLD += 1
              if (r.record === 'SV') pitcherSum.SV += 1
              if (rawIP >= 6 && r.earned_runs <= 3) pitcherSum.QS += 1
            }
          }
        }
      }

      const IP = pitcherSum.OUT / 3
      pitcherSum.IP = `${Math.floor(IP)}.${pitcherSum.OUT % 3}`
      pitcherSum.ERA = IP ? (9 * pitcherSum.ER / IP).toFixed(2) : '0.00'
      pitcherSum.WHIP = IP ? ((pitcherSum.H + pitcherSum.BB) / IP).toFixed(2) : '0.00'

      const obpDen = batterSum.AB + batterSum.BB
      const obp = obpDen ? (batterSum.H + batterSum.BB) / obpDen : 0
      const slg = batterSum.AB ? batterSum.TB / batterSum.AB : 0
      batterSum.AVG = batterSum.AB ? (batterSum.H / batterSum.AB).toFixed(3) : '.000'
      batterSum.OPS = (obp + slg).toFixed(3)

      // 🔹 加入 managers 表格中的 team_name
      const { data: managerData } = await supabase
        .from('managers')
        .select('team_name')
        .eq('id', managerId)
        .single()

      result.push({
        manager_id: Number(managerId),
        team_name: managerData?.team_name || `Manager #${managerId}`,
        batters: batterSum,
        pitchers: pitcherSum
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ weekSummary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
