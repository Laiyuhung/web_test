import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

function getAllDateRanges() {
  const today = new Date()
  const format = d => d.toISOString().slice(0, 10)
  const d = new Date(today)

  const ranges = {
    'Today': { from: format(d), to: format(d) },
    'Yesterday': (() => { const t = new Date(d); t.setDate(t.getDate() - 1); return { from: format(t), to: format(t) } })(),
    'Last 7 days': (() => { const f = new Date(d); f.setDate(f.getDate() - 7); const t = new Date(d); t.setDate(t.getDate() - 1); return { from: format(f), to: format(t) } })(),
    'Last 14 days': (() => { const f = new Date(d); f.setDate(f.getDate() - 14); const t = new Date(d); t.setDate(t.getDate() - 1); return { from: format(f), to: format(t) } })(),
    'Last 30 days': (() => { const f = new Date(d); f.setDate(f.getDate() - 30); const t = new Date(d); t.setDate(t.getDate() - 1); return { from: format(f), to: format(t) } })(),
    '2025 Season': { from: '2025-03-27', to: '2025-11-30' }
  }
  return ranges
}

export async function POST(req) {
  try {
    const { name, type } = await req.json()
    if (!name || !type) return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })

    const ranges = getAllDateRanges()
    const result = {}

    const { data, error } = await supabase
      .from(type === 'batter' ? 'batting_stats' : 'pitching_stats')
      .select('*')
      .eq('name', name)
      .eq('is_major', true)
      .gte('game_date', '2025-03-27')
      .lte('game_date', '2025-11-30')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 初始化每個區段的統計欄位
    const init = type === 'batter'
      ? () => ({ AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0, HBP: 0, SF: 0 })
      : () => ({ W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0, OUT: 0 })

    for (const label in ranges) result[label] = init()

    for (const row of data) {
      const dateStr = row.game_date
      for (const label in ranges) {
        const { from, to } = ranges[label]
        if (dateStr >= from && dateStr <= to) {
          const total = result[label]
          if (type === 'batter') {
            total.AB += row.at_bats || 0
            total.R += row.runs || 0
            total.H += row.hits || 0
            total.HR += row.home_runs || 0
            total.RBI += row.rbis || 0
            total.SB += row.stolen_bases || 0
            total.K += row.strikeouts || 0
            total.GIDP += row.double_plays || 0
            total.XBH += (row.doubles || 0) + (row.triples || 0) + (row.home_runs || 0)
            total.TB += (row.hits - row.doubles - row.triples - row.home_runs || 0) + (row.doubles || 0) * 2 + (row.triples || 0) * 3 + (row.home_runs || 0) * 4
            total.BB += row.walks || 0
            total.HBP += row.hit_by_pitch || 0
            total.SF += row.sacrifice_flies || 0
          } else {
            const rawIP = row.innings_pitched || 0
            const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)
            total.OUT += outs
            total.H += row.hits_allowed || 0
            total.ER += row.earned_runs || 0
            total.K += row.strikeouts || 0
            total.BB += row.walks || 0
            const rec = row.record
            if (rec === 'W') total.W += 1
            if (rec === 'L') total.L += 1
            if (rec === 'H') total.HLD += 1
            if (rec === 'S') total.SV += 1
            if (rawIP >= 6 && row.earned_runs <= 3) total.QS += 1
          }
        }
      }
    }

    // 加上平均指標
    for (const label in result) {
      const total = result[label]
      if (type === 'batter') {
        const OBP_den = total.AB + total.BB + total.HBP + total.SF
        const OBP = OBP_den ? (total.H + total.BB + total.HBP) / OBP_den : 0
        const SLG = total.AB ? total.TB / total.AB : 0
        const AVG = total.AB ? total.H / total.AB : 0
        result[label] = {
          ...total,
          AVG: AVG.toFixed(3),
          OPS: (OBP + SLG).toFixed(3)
        }
      } else {
        const IP_raw = total.OUT / 3
        const ERA = IP_raw
          ? (9 * ER / IP_raw).toFixed(2)
          : (ER > 0 ? 'INF' : '0.00')

        const WHIP = IP_raw
          ? ((BB + H) / IP_raw).toFixed(2)
          : ((BB + H) > 0 ? 'INF' : '0.00')

        result[label] = {
          ...total,
          IP: formatIP(total.OUT),
          ERA: ERA,
          WHIP: WHIP
        }
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ summary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
