import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// OUT 換成 IP 顯示
function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

// 把名字清掉雜訊
function cleanName(name) {
  return (name || '').replace(/[#◎＊*]/g, '')
}

export async function POST(req) {
  try {
    const { type, from, to } = await req.json()
    if (!type || !from || !to) return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })

    const { data, error } = await supabase
      .from(type === 'batter' ? 'batting_stats' : 'pitching_stats')
      .select('*')
      .gte('game_date', from)
      .lte('game_date', to)
      .eq('is_major', true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const statsMap = {}

    for (const row of data) {
      const name = cleanName(row.name || row.player_name)
      if (!name) continue

      if (!statsMap[name]) {
        statsMap[name] = type === 'batter'
          ? { name, AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0, HBP: 0, SF: 0 }
          : { name, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0, OUT: 0 }
      }

      const s = statsMap[name]
      if (type === 'batter') {
        s.AB += row.at_bats || 0
        s.R += row.runs || 0
        s.H += row.hits || 0
        s.HR += row.home_runs || 0
        s.RBI += row.rbis || 0
        s.SB += row.stolen_bases || 0
        s.K += row.strikeouts || 0
        s.GIDP += row.double_plays || 0
        s.XBH += (row.doubles || 0) + (row.triples || 0) + (row.home_runs || 0)
        s.TB += (row.hits - row.doubles - row.triples - row.home_runs || 0) + (row.doubles || 0) * 2 + (row.triples || 0) * 3 + (row.home_runs || 0) * 4
        s.BB += row.walks || 0
        s.HBP += row.hit_by_pitch || 0
        s.SF += row.sacrifice_flies || 0
      } else {
        const rawIP = row.innings_pitched || 0
        const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)
        s.OUT += outs
        s.H += row.hits_allowed || 0
        s.ER += row.earned_runs || 0
        s.K += row.strikeouts || 0
        s.BB += row.walks || 0
        const rec = row.record
        if (rec === 'W') s.W += 1
        if (rec === 'L') s.L += 1
        if (rec === 'H') s.HLD += 1
        if (rec === 'S') s.SV += 1
        if (rawIP >= 6 && row.earned_runs <= 3) s.QS += 1
      }
    }

    const result = Object.values(statsMap).map(s => {
      if (type === 'batter') {
        const OBP_den = s.AB + s.BB + s.HBP + s.SF
        const OBP = OBP_den ? (s.H + s.BB + s.HBP) / OBP_den : 0
        const SLG = s.AB ? s.TB / s.AB : 0
        const AVG = s.AB ? s.H / s.AB : 0
        return {
          ...s,
          AVG: AVG.toFixed(3),
          OPS: (OBP + SLG).toFixed(3)
        }
      } else {
        const IP_raw = s.OUT / 3
        const ERA = IP_raw ? (9 * s.ER / IP_raw) : 0
        const WHIP = IP_raw ? (s.BB + s.H) / IP_raw : 0
        return {
          ...s,
          IP: formatIP(s.OUT),
          ERA: ERA.toFixed(2),
          WHIP: WHIP.toFixed(2)
        }
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ stats 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
