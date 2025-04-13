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

    const { data: pitStats } = await supabase
      .from('pitching_stats')
      .select('*')
      .gte('game_date', start)
      .lte('game_date', end)

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
              batterSum.TB += (r.singles || 0) + (r.doubles || 0) * 2 + (r.triples || 0) * 3 + (r.home_runs || 0) * 4
            }
          }

          if (isPitcher) {
            const rows = pitStats.filter(r => r.name === name && r.game_date === date)
            for (const r of rows) {
              const ip = r.innings_pitched || 0
              const outs = Math.floor(ip) * 3 + Math.round((ip % 1) * 10)
              pitcherSum.OUT += outs
              pitcherSum.H += r.hits_allowed || 0
              pitcherSum.ER += r.earned_runs || 0
              pitcherSum.K += r.strikeouts || 0
              pitcherSum.BB += r.walks || 0
              if (r.record === 'W') pitcherSum.W += 1
              if (r.record === 'L') pitcherSum.L += 1
              if (r.record === 'HLD') pitcherSum.HLD += 1
              if (r.record === 'SV') pitcherSum.SV += 1
              if (ip >= 6 && r.earned_runs <= 3) pitcherSum.QS += 1
            }
          }
        }
      }

      const AB = batterSum.AB || 1
      const IP = pitcherSum.OUT / 3 || 1
      const AVG = (batterSum.H / AB).toFixed(3).replace(/^0/, '.')
      const OBP = (AB + batterSum.BB) ? ((batterSum.H + batterSum.BB) / (AB + batterSum.BB)) : 0
      const SLG = batterSum.TB / AB
      const OPS = (OBP + SLG).toFixed(3).replace(/^0/, '.')
      const ERA = (9 * pitcherSum.ER / IP).toFixed(2)
      const WHIP = ((pitcherSum.H + pitcherSum.BB) / IP).toFixed(2)

      const { data: managerData } = await supabase
        .from('managers')
        .select('team_name')
        .eq('id', managerId)
        .single()

      result.push({
        manager_id: managerId,
        team_name: managerData?.team_name || `Manager #${managerId}`,
        batters: { ...batterSum, AVG, OPS },
        pitchers: { ...pitcherSum, ERA, WHIP, IP: `${Math.floor(IP)}.${pitcherSum.OUT % 3}` }
      })
    }

    const allStats = [
      'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS',
      'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'
    ]

    for (const stat of allStats) {
      const isLowerBetter = ['L', 'H', 'ER', 'BB', 'ERA', 'WHIP', 'GIDP', 'K'].includes(stat)
      const values = result.map(r => {
        const val = r.batters[stat] ?? r.pitchers[stat]
        return { team: r.team_name, value: parseFloat(val) }
      })

      values.sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value)

      console.log(`📊 排名計算 - ${stat}:`, values)

      let i = 0
      const scores = {}
      while (i < values.length) {
        let j = i
        while (j + 1 < values.length && values[j + 1].value === values[i].value) j++
        const total = [...Array(j - i + 1)].reduce((sum, _, k) => sum + (4 - i - k), 0)
        const avg = total / (j - i + 1)
        for (let k = i; k <= j; k++) {
          scores[values[k].team] = avg
          console.log(`🏅 ${stat} ➜ ${values[k].team} 獲得 ${avg.toFixed(2)} 分（原始值: ${values[k].value}）`)
        }
        i = j + 1
      }

      result.forEach(r => {
        if (!r.fantasyPoints) r.fantasyPoints = {}
        r.fantasyPoints[stat] = parseFloat(scores[r.team_name]?.toFixed(2) || '0.00')
      })
    }

    result.forEach(r => {
      r.fantasyPoints.Total = Object.values(r.fantasyPoints).reduce((a, b) => a + b, 0).toFixed(2)
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ weekSummary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
