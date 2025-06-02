// filepath: src/app/api/playerStats/transactionSummary/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

function getNextDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function getPrevDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function POST(req) {
  try {
    const { name, type } = await req.json()
    if (!name || !type) return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })

    // 1. 取得球員編號
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', name)
      .single()
    if (playerError || !playerData) return NextResponse.json({ error: '找不到球員' }, { status: 404 })
    const Player_no = playerData.Player_no

    // 2. 撈出所有異動紀錄
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('transaction_time, type')
      .eq('Player_no', Player_no)
      .order('transaction_time', { ascending: true })
    if (txError) return NextResponse.json({ error: '異動查詢失敗' }, { status: 500 })
    if (!txs || txs.length === 0) return NextResponse.json({ error: '無異動紀錄' }, { status: 404 })

    // 3. 切分區間
    const intervals = []
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i]
      const from = tx.transaction_time.slice(0, 10) // 異動當天
      const to = (i + 1 < txs.length)
        ? getPrevDay(txs[i + 1].transaction_time.slice(0, 10))
        : '2025-11-30' // season end
      intervals.push({
        type: tx.type,
        from,
        to,
        tx_time: tx.transaction_time
      })
    }

    // 4. 撈 stats
    const { data: stats, error: statsError } = await supabase
      .from(type === 'batter' ? 'batting_stats' : 'pitching_stats')
      .select('*')
      .eq('name', name)
      .eq('is_major', true)
      .gte('game_date', intervals[0].from)
      .lte('game_date', intervals[intervals.length - 1].to)
    if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 })

    // 5. 統計每區間
    const result = []
    for (const interval of intervals) {
      const rows = stats.filter(row => row.game_date >= interval.from && row.game_date <= interval.to)
      let total
      if (type === 'batter') {
        total = { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0, HBP: 0, SF: 0 }
        for (const row of rows) {
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
        result.push({
          ...interval,
          stats: {
            ...total,
            AVG: AVG.toFixed(3),
            OPS: (OBP + SLG).toFixed(3)
          }
        })
      } else {
        total = { W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0, OUT: 0 }
        for (const row of rows) {
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
        const IP_raw = total.OUT / 3
        const ERA = IP_raw
          ? (9 * total.ER / IP_raw).toFixed(2)
          : (total.ER > 0 ? 'INF' : '0.00')
        const WHIP = IP_raw
          ? ((total.BB + total.H) / IP_raw).toFixed(2)
          : ((total.BB + total.H) > 0 ? 'INF' : '0.00')
        result.push({
          ...interval,
          stats: {
            ...total,
            IP: formatIP(total.OUT),
            ERA,
            WHIP
          }
        })
      }
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ transactionSummary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
