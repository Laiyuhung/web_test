import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

export async function POST(req) {
  try {
    const { type, from, to, playerNames } = await req.json()
    if (!type || !from || !to || !Array.isArray(playerNames)) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    if (type === 'batter') {
      const { data, error } = await supabase
        .from('batting_stats')
        .select('*')
        .in('name', playerNames)
        .gte('game_date', from)
        .lte('game_date', to)
        .eq('is_major', true)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      let total = {
        AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0,
        K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0,
        HBP: 0, SF: 0
      }

      for (const row of data) {
        total.AB += row.at_bats || 0
        total.R += row.runs || 0
        total.H += row.hits || 0
        total.HR += row.home_runs || 0
        total.RBI += row.runs_batted_in || 0
        total.SB += row.stolen_bases || 0
        total.K += row.strikeouts || 0
        total.BB += row.walks || 0
        total.GIDP += row.ground_into_double_play || 0
        total.XBH += (row.doubles || 0) + (row.triples || 0) + (row.home_runs || 0)
        total.TB += (row.singles || 0) + (row.doubles || 0) * 2 + (row.triples || 0) * 3 + (row.home_runs || 0) * 4
        total.HBP += row.hit_by_pitch || 0
        total.SF += row.sacrifice_flies || 0
      }

      const OBP_den = total.AB + total.BB + total.HBP + total.SF
      const OBP = OBP_den ? (total.H + total.BB + total.HBP) / OBP_den : 0
      const SLG = total.AB ? total.TB / total.AB : 0
      const AVG = total.AB ? total.H / total.AB : 0

      return NextResponse.json({
        ...total,
        AVG: AVG.toFixed(3),
        OPS: (OBP + SLG).toFixed(3)
      })
    }

    if (type === 'pitcher') {
      const { data, error } = await supabase
        .from('pitching_stats')
        .select('*')
        .in('name', playerNames)
        .gte('game_date', from)
        .lte('game_date', to)
        .eq('is_major', true)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      let total = {
        W: 0, L: 0, HLD: 0, SV: 0,
        H: 0, ER: 0, K: 0, BB: 0, QS: 0,
        OUT: 0
      }

      for (const row of data) {
        const rawIP = row.innings_pitched || 0
        const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)

        total.OUT += outs
        total.H += row.hits_allowed || 0
        total.ER += row.earned_runs || 0
        total.K += row.strikeouts || 0
        total.BB += row.walks || 0

        const record = row.record
        if (record === 'W') total.W += 1
        if (record === 'L') total.L += 1
        if (record === 'HLD') total.HLD += 1
        if (record === 'SV') total.SV += 1
        if (rawIP >= 6 && row.earned_runs <= 3) total.QS += 1
      }

      const IP_raw = total.OUT / 3
      const ERA = IP_raw ? (9 * total.ER / IP_raw) : 0
      const WHIP = IP_raw ? (total.BB + total.H) / IP_raw : 0

      return NextResponse.json({
        ...total,
        IP: formatIP(total.OUT),
        ERA: ERA.toFixed(2),
        WHIP: WHIP.toFixed(2)
      })
    }

    return NextResponse.json({ error: '未知類型' }, { status: 400 })
  } catch (err) {
    console.error('❌ stats summary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}