import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

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
      .order('created_at', { ascending: true })
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
    const { week } = await req.json()
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

    // 建立球員與經理ID的對應關係
    const playerManagerMap = {}
    // 建立球員對應的日期和經理ID
    const playerDateMap = {}
    // 球員按經理分組
    const playerMap = {}
    const assignedMap = {}

    for (const row of starters) {
      // 建立球員-經理對應關係
      if (!playerManagerMap[row.player_name]) {
        playerManagerMap[row.player_name] = row.manager_id
      }

      // 記錄球員出賽日期
      if (!playerDateMap[row.player_name]) {
        playerDateMap[row.player_name] = new Set()
      }
      playerDateMap[row.player_name].add(row.date)

      // 按經理分組
      if (!playerMap[row.manager_id]) playerMap[row.manager_id] = {}
      if (!playerMap[row.manager_id][row.player_name]) playerMap[row.manager_id][row.player_name] = new Set()
      playerMap[row.manager_id][row.player_name].add(row.date)

      if (!assignedMap[row.manager_id]) assignedMap[row.manager_id] = {}
      if (!assignedMap[row.manager_id][row.date]) assignedMap[row.manager_id][row.date] = []
      assignedMap[row.manager_id][row.date].push(row)
    }

    const allNames = [...new Set(starters.map(s => s.player_name))]

    const { data: playerTypes } = await supabase
      .from('playerslist')
      .select('Name, B_or_P')
      .in('Name', allNames)

    const typeMap = Object.fromEntries(playerTypes.map(p => [p.Name, p.B_or_P]))

    const batStats = await fetchAllBattingStats(start, end);
    const pitStats = await fetchAllPitchingStats(start, end);

    // 計算每個球員的總計數據
    const batterStatsMap = {}
    const pitcherStatsMap = {}

    // 處理打者數據
    batStats.forEach(stat => {
      const playerName = stat.name
      if (!playerDateMap[playerName]) return // 非本週先發球員

      // 確認這是這個球員在該日的數據
      if (playerDateMap[playerName].has(stat.game_date)) {
        if (!batterStatsMap[playerName]) {
          batterStatsMap[playerName] = {
            name: playerName,
            position: stat.position || 'Unknown',
            at_bats: 0,
            runs: 0,
            hits: 0,
            rbis: 0,
            home_runs: 0,
            doubles: 0,
            triples: 0,
            stolen_bases: 0,
            strikeouts: 0,
            walks: 0,
            double_plays: 0,
            manager_id: playerManagerMap[playerName]
          }
        }
        
        // 累計數據
        batterStatsMap[playerName].at_bats += stat.at_bats || 0
        batterStatsMap[playerName].runs += stat.runs || 0
        batterStatsMap[playerName].hits += stat.hits || 0
        batterStatsMap[playerName].rbis += stat.rbis || 0
        batterStatsMap[playerName].home_runs += stat.home_runs || 0
        batterStatsMap[playerName].doubles += stat.doubles || 0
        batterStatsMap[playerName].triples += stat.triples || 0
        batterStatsMap[playerName].stolen_bases += stat.stolen_bases || 0
        batterStatsMap[playerName].strikeouts += stat.strikeouts || 0
        batterStatsMap[playerName].walks += stat.walks || 0
        batterStatsMap[playerName].double_plays += stat.double_plays || 0
      }
    })

    // 處理投手數據
    pitStats.forEach(stat => {
      const playerName = stat.name
      if (!playerDateMap[playerName]) return // 非本週先發球員

      // 確認這是這個球員在該日的數據
      if (playerDateMap[playerName].has(stat.game_date)) {
        if (!pitcherStatsMap[playerName]) {
          pitcherStatsMap[playerName] = {
            name: playerName,
            position: stat.position || 'P',
            outs: 0,
            wins: 0,
            losses: 0,
            holds: 0,
            saves: 0,
            hits: 0,
            earned_runs: 0,
            strikeouts: 0,
            walks: 0,
            quality_starts: 0,
            manager_id: playerManagerMap[playerName]
          }
        }
        
        // 累計數據
        pitcherStatsMap[playerName].outs += stat.outs || 0
        pitcherStatsMap[playerName].wins += stat.wins || 0
        pitcherStatsMap[playerName].losses += stat.losses || 0
        pitcherStatsMap[playerName].holds += stat.holds || 0
        pitcherStatsMap[playerName].saves += stat.saves || 0
        pitcherStatsMap[playerName].hits += stat.hits || 0
        pitcherStatsMap[playerName].earned_runs += stat.earned_runs || 0
        pitcherStatsMap[playerName].strikeouts += stat.strikeouts || 0
        pitcherStatsMap[playerName].walks += stat.walks || 0
        pitcherStatsMap[playerName].quality_starts += stat.quality_starts || 0
      }
    })

    // 整理返回結果
    const result = []
    const allManagerIds = [1, 2, 3, 4]

    for (const managerId of allManagerIds) {
      const managerData = await supabase
        .from('managers')
        .select('team_name')
        .eq('id', managerId)
        .single()

      // 獲取該經理的打者和投手
      const managerBatters = Object.values(batterStatsMap).filter(b => b.manager_id === managerId)
      const managerPitchers = Object.values(pitcherStatsMap).filter(p => p.manager_id === managerId)

      // 格式化為前端需要的表格數據
      const batterRows = managerBatters.map(b => ({
        id: null,
        name: b.name,
        position: b.position,
        at_bats: b.at_bats,
        runs: b.runs,
        hits: b.hits,
        rbis: b.rbis,
        home_runs: b.home_runs,
        doubles: b.doubles,
        triples: b.triples,
        stolen_bases: b.stolen_bases,
        strikeouts: b.strikeouts,
        walks: b.walks,
        double_plays: b.double_plays
      }))

      const pitcherRows = managerPitchers.map(p => ({
        id: null,
        name: p.name,
        position: p.position,
        outs: p.outs,
        wins: p.wins,
        losses: p.losses,
        holds: p.holds,
        saves: p.saves,
        hits: p.hits,
        earned_runs: p.earned_runs,
        strikeouts: p.strikeouts,
        walks: p.walks,
        quality_starts: p.quality_starts,
        ip: `${Math.floor(p.outs / 3)}.${p.outs % 3}`
      }))

      result.push({
        manager_id: managerId,
        team_name: managerData?.team_name || `Manager #${managerId}`,
        batterRows,
        pitcherRows,
        assignedRoster: assignedMap[managerId] || {}
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ matchup_total 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
