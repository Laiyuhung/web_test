import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

async function fetchAllAssignedPositionHistory(date, managerId) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('assigned_position_history')
      .select('*')
      .eq('manager_id', managerId)
      .eq('date', date)
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

async function fetchAllBattingStats(date, playerNames) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('batting_stats')
      .select('*')
      .eq('is_major', true)
      .eq('game_date', date)
      .in('name', playerNames)
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

async function fetchAllPitchingStats(date, playerNames) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('pitching_stats')
      .select('*')
      .eq('is_major', true)
      .eq('game_date', date)
      .in('name', playerNames)
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
    const { managerId, date } = await req.json()
    
    if (!managerId || !date) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    console.log('🔍 今日球員詳細查找參數:', { managerId, date });

    const assigned = await fetchAllAssignedPositionHistory(date, managerId);
    console.log('📋 assigned_position_history 查找數量:', assigned.length);

    // 只取先發球員
    const starters = assigned.filter(row => !['BN', 'NA', 'NA(備用)'].includes(row.position))

    const playerNames = [...new Set(starters.map(row => row.player_name))]
    if (playerNames.length === 0) {
      return NextResponse.json({ batterRows: [], pitcherRows: [] })
    }

    const { data: playerTypes } = await supabase
      .from('playerslist')
      .select('Name, B_or_P')
      .in('Name', playerNames)
    console.log('📋 playerslist 查找數量:', playerTypes.length);

    const typeMap = Object.fromEntries(playerTypes.map(p => [p.Name, p.B_or_P]))

    const batStats = await fetchAllBattingStats(date, playerNames);
    console.log('📋 batting_stats 查找數量:', batStats.length);

    const pitStats = await fetchAllPitchingStats(date, playerNames);
    console.log('📋 pitching_stats 查找數量:', pitStats.length);

    const batterRows = []
    const pitcherRows = []

    for (const name of playerNames) {
      const isBatter = typeMap[name] === 'Batter'
      const isPitcher = typeMap[name] === 'Pitcher'

      if (isBatter) {
        const batterSum = { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0 }
        
        const rows = batStats.filter(r => r.name === name)
        for (const r of rows) {
          batterSum.AB += r.at_bats || 0
          batterSum.R += r.runs || 0
          batterSum.H += r.hits || 0
          batterSum.HR += r.home_runs || 0
          batterSum.RBI += r.rbis || 0
          batterSum.SB += r.stolen_bases || 0
          batterSum.K += r.strikeouts || 0
          batterSum.BB += r.walks || 0
          batterSum.GIDP += r.double_plays || 0
          batterSum.XBH += ((r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0))
          const singles = (r.hits || 0) - ((r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0))
          batterSum.TB += singles + (r.doubles || 0) * 2 + (r.triples || 0) * 3 + (r.home_runs || 0) * 4
        }

        const AB = batterSum.AB || 0
        const rawAVG = AB ? batterSum.H / AB : 0
        const AVG = rawAVG.toFixed(3).replace(/^0\./, '.')
        
        const OBP = (AB + batterSum.BB) ? ((batterSum.H + batterSum.BB) / (AB + batterSum.BB)) : 0
        const SLG = AB ? batterSum.TB / AB : 0
        const rawOPS = OBP + SLG
        const OPS = rawOPS.toFixed(3).replace(/^0\./, '.')

        batterRows.push({
          Name: name,
          AB: batterSum.AB,
          R: batterSum.R,
          H: batterSum.H,
          HR: batterSum.HR,
          RBI: batterSum.RBI,
          SB: batterSum.SB,
          K: batterSum.K,
          BB: batterSum.BB,
          GIDP: batterSum.GIDP,
          XBH: batterSum.XBH,
          TB: batterSum.TB,
          AVG,
          OPS
        })
      }

      if (isPitcher) {
        const pitcherSum = { OUT: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0 }
        
        const rows = pitStats.filter(r => r.name === name)
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

        const IP = pitcherSum.OUT / 3 || 0
        const ERA = IP ? (9 * pitcherSum.ER / IP).toFixed(2) : '0.00'
        const WHIP = IP ? ((pitcherSum.H + pitcherSum.BB) / IP).toFixed(2) : '0.00'

        pitcherRows.push({
          Name: name,
          IP: `${Math.floor(IP)}.${pitcherSum.OUT % 3}`,
          W: pitcherSum.W,
          L: pitcherSum.L,
          HLD: pitcherSum.HLD,
          SV: pitcherSum.SV,
          H: pitcherSum.H,
          ER: pitcherSum.ER,
          K: pitcherSum.K,
          BB: pitcherSum.BB,
          QS: pitcherSum.QS,
          OUT: pitcherSum.OUT,
          ERA,
          WHIP
        })
      }
    }

    return NextResponse.json({ batterRows, pitcherRows })
  } catch (err) {
    console.error('❌ 今日球員詳細錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
