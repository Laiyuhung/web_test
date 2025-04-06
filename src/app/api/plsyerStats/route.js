import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { type, from, to } = await req.json()
    if (!type || !from || !to) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    if (type === 'batter') {
      const { data, error } = await supabase
        .from('batting_stats')
        .select('*')
        .gte('game_date', from)
        .lte('game_date', to)
        .eq('is_major', true)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const statsMap = {}
      for (const row of data) {
        const name = row.name || row.player_name
        if (!statsMap[name]) {
          statsMap[name] = {
            name,
            AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0,
            K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0,
            HBP: 0, SF: 0
          }
        }
        const s = statsMap[name]
        s.AB += row.at_bats || 0
        s.R += row.runs || 0
        s.H += row.hits || 0
        s.HR += row.home_runs || 0
        s.RBI += row.runs_batted_in || 0
        s.SB += row.stolen_bases || 0
        s.K += row.strikeouts || 0
        s.GIDP += row.ground_into_double_play || 0
        s.XBH += (row.doubles || 0) + (row.triples || 0) + (row.home_runs || 0)
        s.TB += (row.singles || 0) + (row.doubles || 0) * 2 + (row.triples || 0) * 3 + (row.home_runs || 0) * 4
        s.BB += row.walks || 0
        s.HBP += row.hit_by_pitch || 0
        s.SF += row.sacrifice_flies || 0
      }

      const result = Object.values(statsMap).map(s => {
        const OBP_den = s.AB + s.BB + s.HBP + s.SF
        const OBP = OBP_den ? (s.H + s.BB + s.HBP) / OBP_den : 0
        const SLG = s.AB ? s.TB / s.AB : 0
        const AVG = s.AB ? s.H / s.AB : 0
        return {
          ...s,
          AVG: AVG.toFixed(3),
          OPS: (OBP + SLG).toFixed(3)
        }
      })

      return NextResponse.json(result)
    }

    if (type === 'pitcher') {
      const { data, error } = await supabase
        .from('pitching_stats')
        .select('*')
        .gte('game_date', from)
        .lte('game_date', to)
        .eq('is_major', true)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const statsMap = {}
      for (const row of data) {
        const name = row.name
        if (!statsMap[name]) {
          statsMap[name] = {
            name,
            IP: 0, W: 0, L: 0, HLD: 0, SV: 0,
            H: 0, ER: 0, K: 0, BB: 0, QS: 0
          }
        }
        const s = statsMap[name]
        const ip = row.innings_pitched || 0
        s.IP += ip
        s.H += row.hits_allowed || 0
        s.ER += row.earned_runs || 0
        s.K += row.strikeouts || 0
        s.BB += row.walks || 0

        const record = row.record
        if (record === 'W') s.W += 1
        if (record === 'L') s.L += 1
        if (record === 'HLD') s.HLD += 1
        if (record === 'SV') s.SV += 1
        if (ip >= 6 && row.earned_runs <= 3) s.QS += 1
      }

      const result = Object.values(statsMap).map(s => {
        const OUT = s.IP * 3
        const ERA = s.IP ? (9 * s.ER / s.IP) : 0
        const WHIP = s.IP ? (s.BB + s.H) / s.IP : 0
        return {
          ...s,
          OUT,
          ERA: ERA.toFixed(2),
          WHIP: WHIP.toFixed(2)
        }
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: '未知類型' }, { status: 400 })
  } catch (err) {
    console.error('❌ stats 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
