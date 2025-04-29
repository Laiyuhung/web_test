import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

export async function POST(req) {
  try {
    const { type, from, to } = await req.json()

    if (!type || !from || !to) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    console.log('📥 接收到:', { type, from, to })

    // 【步驟 1】從 Supabase 撈 playersList
    const { data: players, error: playersError } = await supabase
      .from('playerslist')
      .select('Name, B_or_P')
      .eq('B_or_P', type)

    if (playersError) {
      console.error('❌ 撈取 playerslist 失敗:', playersError)
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    if (!players || players.length === 0) {
      console.log('⚠️ 找不到符合類型的球員')
      return NextResponse.json({ error: '找不到符合類型的球員' }, { status: 400 })
    }

    console.log('✅ 撈到符合球員:', players.map(p => p.Name))

    const names = players.map(p => p.Name)

    // 【步驟 2】從打者或投手成績表查詢符合的人
    const { data: statsData, error: statsError } = await supabase
      .from(type === 'batter' ? 'batting_stats' : 'pitching_stats')
      .select('*')
      .in('name', names)
      .eq('is_major', true)
      .gte('game_date', from)
      .lte('game_date', to)

    if (statsError) {
      console.error('❌ 查詢 stats 失敗:', statsError)
      return NextResponse.json({ error: statsError.message }, { status: 500 })
    }

    console.log('📊 查到成績資料筆數:', statsData.length)

    const result = type === 'batter'
      ? { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0, HBP: 0, SF: 0 }
      : { W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0, OUT: 0 }

    // 【步驟 3】累加統計
    for (const row of statsData) {
      if (type === 'batter') {
        result.AB += row.at_bats || 0
        result.R += row.runs || 0
        result.H += row.hits || 0
        result.HR += row.home_runs || 0
        result.RBI += row.rbis || 0
        result.SB += row.stolen_bases || 0
        result.K += row.strikeouts || 0
        result.GIDP += row.double_plays || 0
        result.XBH += (row.doubles || 0) + (row.triples || 0) + (row.home_runs || 0)
        result.TB += (row.hits - row.doubles - row.triples - row.home_runs || 0)
          + (row.doubles || 0) * 2
          + (row.triples || 0) * 3
          + (row.home_runs || 0) * 4
        result.BB += row.walks || 0
        result.HBP += row.hit_by_pitch || 0
        result.SF += row.sacrifice_flies || 0
      } else {
        const rawIP = row.innings_pitched || 0
        const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)
        result.OUT += outs
        result.H += row.hits_allowed || 0
        result.ER += row.earned_runs || 0
        result.K += row.strikeouts || 0
        result.BB += row.walks || 0
        const rec = row.record
        if (rec === 'W') result.W += 1
        if (rec === 'L') result.L += 1
        if (rec === 'H') result.HLD += 1
        if (rec === 'S') result.SV += 1
        if (rawIP >= 6 && row.earned_runs <= 3) result.QS += 1
      }
    }

    console.log('📈 累加後總結果:', result)

    // 【步驟 4】加上平均指標並回傳
    if (type === 'batter') {
      const OBP_den = result.AB + result.BB + result.HBP + result.SF
      const OBP = OBP_den ? (result.H + result.BB + result.HBP) / OBP_den : 0
      const SLG = result.AB ? result.TB / result.AB : 0
      const AVG = result.AB ? result.H / result.AB : 0

      return NextResponse.json({
        ...result,
        AVG: AVG.toFixed(3),
        OPS: (OBP + SLG).toFixed(3),
      })
    } else {
      const IP_raw = result.OUT / 3
      const ERA = IP_raw ? (9 * result.ER / IP_raw) : 0
      const WHIP = IP_raw ? (result.BB + result.H) / IP_raw : 0

      return NextResponse.json({
        ...result,
        IP: formatIP(result.OUT),
        ERA: ERA.toFixed(2),
        WHIP: WHIP.toFixed(2),
      })
    }
  } catch (err) {
    console.error('❌ summary 錯誤:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
