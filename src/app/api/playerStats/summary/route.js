import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

function getDateRange(label) {
  const today = new Date()
  const format = d => d.toISOString().slice(0, 10)
  const d = new Date(today)
  switch (label) {
    case 'Today':
      return { from: format(d), to: format(d) }
    case 'Yesterday':
      d.setDate(d.getDate() - 1)
      return { from: format(d), to: format(d) }
    case 'Last 7 days': {
      const from = new Date(today); from.setDate(from.getDate() - 7)
      const to = new Date(today); to.setDate(to.getDate() - 1)
      return { from: format(from), to: format(to) }
    }
    case 'Last 14 days': {
      const from = new Date(today); from.setDate(from.getDate() - 14)
      const to = new Date(today); to.setDate(to.getDate() - 1)
      return { from: format(from), to: format(to) }
    }
    case 'Last 30 days': {
      const from = new Date(today); from.setDate(from.getDate() - 30)
      const to = new Date(today); to.setDate(to.getDate() - 1)
      return { from: format(from), to: format(to) }
    }
    case '2025 Season':
    default:
      return { from: '2025-03-27', to: '2025-11-30' }
  }
}

export async function POST(req) {
  try {
    const { name, type } = await req.json()
    if (!name || !type) return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })

    const labels = ['Today', 'Yesterday', 'Last 7 days', 'Last 14 days', 'Last 30 days', '2025 Season']
    const result = {}

    for (const label of labels) {
      const { from, to } = getDateRange(label)

      if (type === 'batter') {
        const { data, error } = await supabase
          .from('batting_stats')
          .select('*')
          .eq('name', name)
          .gte('game_date', from)
          .lte('game_date', to)
          .eq('is_major', true)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const total = {
          AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0,
          K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0,
          HBP: 0, SF: 0
        }

        for (const row of data) {
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
        }

        const OBP_den = total.AB + total.BB + total.HBP + total.SF
        const OBP = OBP_den ? (total.H + total.BB + total.HBP) / OBP_den : 0
        const SLG = total.AB ? total.TB / total.AB : 0
        const AVG = total.AB ? total.H / total.AB : 0

        result[label] = {
          ...total,
          AVG: AVG.toFixed(3),
          OPS: (OBP + SLG).toFixed(3)
        }
      }

      if (type === 'pitcher') {
        const { data, error } = await supabase
          .from('pitching_stats')
          .select('*')
          .eq('name', name)
          .gte('game_date', from)
          .lte('game_date', to)
          .eq('is_major', true)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const total = {
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
          if (record === 'H') total.HLD += 1
          if (record === 'S') total.SV += 1
          if (rawIP >= 6 && row.earned_runs <= 3) total.QS += 1
        }

        const IP_raw = total.OUT / 3
        const ERA = IP_raw ? (9 * total.ER / IP_raw) : 0
        const WHIP = IP_raw ? (total.BB + total.H) / IP_raw : 0

        result[label] = {
          ...total,
          IP: formatIP(total.OUT),
          ERA: ERA.toFixed(2),
          WHIP: WHIP.toFixed(2)
        }
      }
    }
    console.log('🚀 最終回傳資料:', result)


    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ summary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
