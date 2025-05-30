import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// 幾乎複製 weekly_stats_by_manager，但最後回傳多加 AB/IP/OPS/AVG/ERA/WHIP 的正確加總

async function fetchAllAssignedPositionHistory(start, end) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;
  while (!done) {
    const { data, error } = await supabase
      .from('assigned_position_history')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
      .order('player_name', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`❌ 讀取 assigned_position_history 失敗: ${error.message}`);
    allData = allData.concat(data);
    if (data.length < pageSize) {
      done = true;
    } else {
      page++;
    }
  }
  return allData;
}

async function fetchAllBattingStats(from, to) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;
  while (!done) {
    const { data, error } = await supabase
      .from('batting_stats')
      .select('*')
      .eq('is_major', true)
      .gte('game_date', from)
      .lte('game_date', to)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`❌ 讀取 batting_stats 失敗: ${error.message}`);
    allData = allData.concat(data);
    if (data.length < pageSize) {
      done = true;
    } else {
      page++;
    }
  }
  return allData;
}

async function fetchAllPitchingStats(from, to) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;
  while (!done) {
    const { data, error } = await supabase
      .from('pitching_stats')
      .select('*')
      .eq('is_major', true)
      .gte('game_date', from)
      .lte('game_date', to)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`❌ 讀取 pitching_stats 失敗: ${error.message}`);
    allData = allData.concat(data);
    if (data.length < pageSize) {
      done = true;
    } else {
      page++;
    }
  }
  return allData;
}

export async function POST(req) {
  try {
    let { week } = await req.json()
    week = week?.trim()
    if (!week) return NextResponse.json({ error: '缺少 week 參數' }, { status: 400 })
    const { data: weekData } = await supabase
      .from('schedule_date')
      .select('*')
      .eq('week', week)
      .single()
    if (!weekData) return NextResponse.json({ error: '查無週次資料' }, { status: 404 })
    const { start, end } = weekData
    const assigned = await fetchAllAssignedPositionHistory(start, end);
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
    const batStats = await fetchAllBattingStats(start, end);
    const pitStats = await fetchAllPitchingStats(start, end);
    const result = []
    const allManagerIds = [1, 2, 3, 4]
    for (const managerId of allManagerIds) {
      const players = playerMap[managerId] || {}
      let batterSum = { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0 }
      let pitcherSum = { OUT: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0 }
      let batter_OBP_num = 0, batter_OBP_den = 0
      let batter_H = 0, batter_BB = 0
      let batter_TB = 0
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
              // 針對 H(安打) 加總過程加 log
              console.log(`[週${week}] Manager#${managerId} ${name} ${date} H(安打) +=`, r.hits || 0, '=>', batterSum.H)
              batterSum.HR += r.home_runs || 0
              batterSum.RBI += r.rbis || 0
              batterSum.SB += r.stolen_bases || 0
              batterSum.K += r.strikeouts || 0
              batterSum.BB += r.walks || 0
              batterSum.GIDP += r.double_plays || 0
              batterSum.XBH +=  ((r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0))
              const singles = (r.hits || 0) - ((r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0))
              batterSum.TB += singles + (r.doubles || 0) * 2 + (r.triples || 0) * 3 + (r.home_runs || 0) * 4
              // for OBP
              batter_H += r.hits || 0
              batter_BB += r.walks || 0
              batter_OBP_num += (r.hits || 0) + (r.walks || 0)
              batter_OBP_den += (r.at_bats || 0) + (r.walks || 0)
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
              if (r.record === 'H') pitcherSum.HLD += 1
              if (r.record === 'S') pitcherSum.SV += 1
              if (ip >= 6 && r.earned_runs <= 3) pitcherSum.QS += 1
            }
          }
        }
      }
      const AB = batterSum.AB || 0
      const IP = pitcherSum.OUT / 3 || 0
      // AVG
      const rawAVG = AB ? batterSum.H / AB : 0
      const AVG = rawAVG.toFixed(3).replace(/^0\./, '.')
      // OBP
      const OBP = batter_OBP_den ? (batter_OBP_num / batter_OBP_den) : 0
      // SLG
      const SLG = AB ? batterSum.TB / AB : 0
      // OPS
      const rawOPS = OBP + SLG
      const OPS = rawOPS.toFixed(3).replace(/^0\./, '.')
      // ERA
      const ERA = IP ? (9 * pitcherSum.ER / IP).toFixed(2) : '0.00'
      // WHIP
      const WHIP = IP ? ((pitcherSum.H + pitcherSum.BB) / IP).toFixed(2) : '0.00'
      // 顯示分週加總過程
      console.log(`[週${week}] Manager#${managerId} 打者加總`, batterSum, `AVG=${AVG} OBP=${OBP.toFixed(3)} SLG=${SLG.toFixed(3)} OPS=${OPS}`)
      console.log(`[週${week}] Manager#${managerId} 投手加總`, pitcherSum, `IP=${IP.toFixed(2)} ERA=${ERA} WHIP=${WHIP}`)
      const { data: managerData } = await supabase
        .from('managers')
        .select('team_name')
        .eq('id', managerId)
        .single()
      result.push({
        manager_id: managerId,
        team_name: managerData?.team_name || `Manager #${managerId}`,
        batters: { ...batterSum, AVG, OPS, OBP: OBP.toFixed(3), SLG: SLG.toFixed(3), AB },
        pitchers: { ...pitcherSum, ERA, WHIP, IP: IP.toFixed(2) },
      })
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
