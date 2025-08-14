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
      .order('player_name', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`❌ 讀取 assigned_position_history 失敗: ${error.message}`);

    console.log(`📄 assigned_position_history 第 ${page + 1} 頁，拿到 ${data.length} 筆`);
    allData = allData.concat(data);

    if (data.length < pageSize) {
      done = true;
    } else {
      page++;
    }
  }

  console.log(`✅ assigned_position_history 全部讀取完成，共 ${allData.length} 筆`);
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

    console.log(`📄 batting_stats 第 ${page + 1} 頁，拿到 ${data.length} 筆`);
    allData = allData.concat(data);

    if (data.length < pageSize) {
      done = true;
    } else {
      page++;
    }
  }

  console.log(`✅ batting_stats 全部讀取完成，共 ${allData.length} 筆`);
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

    console.log(`📄 pitching_stats 第 ${page + 1} 頁，拿到 ${data.length} 筆`);
    allData = allData.concat(data);

    if (data.length < pageSize) {
      done = true;
    } else {
      page++;
    }
  }

  console.log(`✅ pitching_stats 全部讀取完成，共 ${allData.length} 筆`);
  return allData;
}

export async function POST(req) {
  try {
    const { matchupId, team1, team2, startDate, endDate } = await req.json()
    
    if (!startDate || !endDate) {
      return NextResponse.json({ error: '缺少必要參數: startDate 或 endDate' }, { status: 400 })
    }

    console.log('🔍 季後賽查找參數:', { matchupId, team1, team2, startDate, endDate });

    const assigned = await fetchAllAssignedPositionHistory(startDate, endDate);
    console.log('📋 assigned_position_history 查找數量:', assigned.length);

    // 只取先發球員，並只取指定的兩個隊伍
    const starters = assigned.filter(row => 
      !['BN', 'NA', 'NA(備用)'].includes(row.position) && 
      [team1, team2].includes(row.manager_id)
    )

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
    console.log('📋 playerslist 查找數量:', playerTypes.length);

    const typeMap = Object.fromEntries(playerTypes.map(p => [p.Name, p.B_or_P]))

    const batStats = await fetchAllBattingStats(startDate, endDate);
    console.log('📋 batting_stats 查找數量:', batStats.length);

    const pitStats = await fetchAllPitchingStats(startDate, endDate);
    console.log('📋 pitching_stats 查找數量:', pitStats.length);

    const result = []
    const targetTeams = [team1, team2]

    for (const managerId of targetTeams) {
      if (!managerId) {
        // 如果 managerId 是 null，建立 TBD 資料
        result.push({
          manager_id: null,
          team_name: null,
          batters: { 
            AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0,
            AVG: '.000', OPS: '.000', fantasyPoints: {} 
          },
          pitchers: { 
            OUT: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0,
            ERA: '0.00', WHIP: '0.00', IP: '0.0', fantasyPoints: {} 
          }
        })
        continue
      }

      const players = playerMap[managerId] || {}
      const batterSum = { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0 }
      const pitcherSum = { OUT: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0 }

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

      const rawAVG = AB ? batterSum.H / AB : 0
      const AVG = rawAVG.toFixed(3).replace(/^0\./, '.')

      const OBP = (AB + batterSum.BB) ? ((batterSum.H + batterSum.BB) / (AB + batterSum.BB)) : 0
      const SLG = AB ? batterSum.TB / AB : 0
      const rawOPS = OBP + SLG
      const OPS = rawOPS.toFixed(3).replace(/^0\./, '.')

      const ERA = IP ? (9 * pitcherSum.ER / IP).toFixed(2) : '0.00'
      const WHIP = IP ? ((pitcherSum.H + pitcherSum.BB) / IP).toFixed(2) : '0.00'

      const { data: managerData } = await supabase
        .from('managers')
        .select('team_name')
        .eq('id', managerId)
        .single()

      result.push({
        manager_id: managerId,
        team_name: managerData?.team_name || `Manager #${managerId}`,
        batters: { ...batterSum, AVG, OPS, fantasyPoints: {} },
        pitchers: { ...pitcherSum, ERA, WHIP, IP: `${Math.floor(IP)}.${pitcherSum.OUT % 3}`, fantasyPoints: {} }
      })
    }

    // === 季後賽計分：一對一比較，優勝者得1分，敗者得0分 ===
    const batterStats = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
    const pitcherStats = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
    
    const team1Data = result.find(r => r.manager_id === team1)
    const team2Data = result.find(r => r.manager_id === team2)

    if (team1Data && team2Data) {
      // 打者項目比較
      for (const stat of batterStats) {
        const isLowerBetter = ['K', 'GIDP'].includes(stat)
        const team1Value = parseFloat(team1Data.batters[stat]) || 0
        const team2Value = parseFloat(team2Data.batters[stat]) || 0
        
        let team1Score = 0, team2Score = 0
        
        if (team1Value !== team2Value) {
          if (isLowerBetter) {
            // 數值越低越好
            team1Score = team1Value < team2Value ? 1 : 0
            team2Score = team2Value < team1Value ? 1 : 0
          } else {
            // 數值越高越好
            team1Score = team1Value > team2Value ? 1 : 0
            team2Score = team2Value > team1Value ? 1 : 0
          }
        }
        
        team1Data.batters.fantasyPoints[stat] = team1Score
        team2Data.batters.fantasyPoints[stat] = team2Score
      }

      // 投手項目比較
      const pitcherLowerBetter = ['L', 'H', 'ER', 'BB', 'ERA', 'WHIP']
      for (const stat of pitcherStats) {
        const isLowerBetter = pitcherLowerBetter.includes(stat)
        const team1Value = parseFloat(team1Data.pitchers[stat]) || 0
        const team2Value = parseFloat(team2Data.pitchers[stat]) || 0
        
        let team1Score = 0, team2Score = 0
        
        if (team1Value !== team2Value) {
          if (isLowerBetter) {
            // 數值越低越好
            team1Score = team1Value < team2Value ? 1 : 0
            team2Score = team2Value < team1Value ? 1 : 0
          } else {
            // 數值越高越好
            team1Score = team1Value > team2Value ? 1 : 0
            team2Score = team2Value > team1Value ? 1 : 0
          }
        }
        
        team1Data.pitchers.fantasyPoints[stat] = team1Score
        team2Data.pitchers.fantasyPoints[stat] = team2Score
      }
    } else {
      // 如果有一隊是 null，則初始化所有項目為 0 分
      result.forEach(r => {
        if (r.manager_id) {
          batterStats.forEach(stat => {
            if (!r.batters.fantasyPoints) r.batters.fantasyPoints = {}
            r.batters.fantasyPoints[stat] = 0
          })
          pitcherStats.forEach(stat => {
            if (!r.pitchers.fantasyPoints) r.pitchers.fantasyPoints = {}
            r.pitchers.fantasyPoints[stat] = 0
          })
        }
      })
    }

    // 計算總分
    result.forEach(r => {
      const batterTotal = Object.values(r.batters.fantasyPoints || {}).reduce((a, b) => a + b, 0)
      const pitcherTotal = Object.values(r.pitchers.fantasyPoints || {}).reduce((a, b) => a + b, 0)
      const total = batterTotal + pitcherTotal
      
      r.fantasyPoints = {
        Total: total.toString()
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ 季後賽統計錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
