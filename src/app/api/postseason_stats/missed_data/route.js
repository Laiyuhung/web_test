import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

async function fetchAllAssignedPositionHistory(start, end, managerId) {
  const pageSize = 1000;
  let allData = [];
  let page = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('assigned_position_history')
      .select('*')
      .eq('manager_id', managerId)
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

async function fetchAllBattingStats(from, to, playerNames) {
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

async function fetchAllPitchingStats(from, to, playerNames) {
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

export async function POST(request) {
  try {
    const { managerId, startDate, endDate } = await request.json()

    console.log(`🔍 [錯失數據] 取得管理員 ${managerId} 的錯失數據，日期範圍: ${startDate} ~ ${endDate}`)

    // 1. 取得該經理人在該期間的先發陣容設定
    const assignedData = await fetchAllAssignedPositionHistory(startDate, endDate, managerId)
    console.log(`📋 取得 ${assignedData.length} 筆先發陣容資料`)

    // 2. 找出經理人所有球員名單（不限於先發）
    const { data: allPlayerData, error: playerError } = await supabase
      .from('assigned_position_history')
      .select('player_name')
      .eq('manager_id', managerId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (playerError) {
      throw new Error(`❌ 讀取球員名單失敗: ${playerError.message}`)
    }

    const allPlayerNames = [...new Set(allPlayerData.map(p => p.player_name))]
    console.log(`👥 該經理人總共有 ${allPlayerNames.length} 位球員`)

    // 3. 建立每日先發球員對照表
    const dailyStarters = {}
    assignedData.forEach(item => {
      if (!dailyStarters[item.date]) {
        dailyStarters[item.date] = new Set()
      }
      // 排除板凳球員和非先發位置
      if (!['BN', 'NA', 'NA(備用)', 'Bench'].includes(item.position)) {
        dailyStarters[item.date].add(item.player_name)
      }
    })

    // 4. 取得所有球員的打擊和投球數據
    const battingData = await fetchAllBattingStats(startDate, endDate, allPlayerNames)
    const pitchingData = await fetchAllPitchingStats(startDate, endDate, allPlayerNames)

    console.log(`🏏 取得 ${battingData.length} 筆打擊數據`)
    console.log(`⚾ 取得 ${pitchingData.length} 筆投球數據`)

    // 5. 分析錯失數據（非先發球員的表現）
    const missedBatterData = {}
    const missedPitcherData = {}

    // 處理打擊錯失數據
    battingData.forEach(record => {
      const gameDate = record.game_date
      const playerName = record.name
      
      // 檢查該球員該日是否為先發
      const isStarter = dailyStarters[gameDate]?.has(playerName) || false
      
      if (!isStarter) {
        // 這是錯失數據
        if (!missedBatterData[playerName]) {
          missedBatterData[playerName] = {
            AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0
          }
        }
        
        missedBatterData[playerName].AB += record.at_bats || 0
        missedBatterData[playerName].R += record.runs || 0
        missedBatterData[playerName].H += record.hits || 0
        missedBatterData[playerName].HR += record.home_runs || 0
        missedBatterData[playerName].RBI += record.rbis || 0
        missedBatterData[playerName].SB += record.stolen_bases || 0
        missedBatterData[playerName].K += record.strikeouts || 0
        missedBatterData[playerName].BB += record.walks || 0
        missedBatterData[playerName].GIDP += record.gidp || 0
        
        const doubles = record.doubles || 0
        const triples = record.triples || 0
        const hr = record.home_runs || 0
        missedBatterData[playerName].XBH += (doubles + triples + hr)
        missedBatterData[playerName].TB += record.total_bases || 0
      }
    })

    // 處理投球錯失數據
    pitchingData.forEach(record => {
      const gameDate = record.game_date
      const playerName = record.name
      
      // 檢查該球員該日是否為先發
      const isStarter = dailyStarters[gameDate]?.has(playerName) || false
      
      if (!isStarter) {
        // 這是錯失數據
        if (!missedPitcherData[playerName]) {
          missedPitcherData[playerName] = {
            IP: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0, OUT: 0
          }
        }
        
        const outs = record.outs_pitched || 0
        const ip = outs / 3
        
        missedPitcherData[playerName].OUT += outs
        missedPitcherData[playerName].H += record.hits_allowed || 0
        missedPitcherData[playerName].ER += record.earned_runs || 0
        missedPitcherData[playerName].K += record.strikeouts || 0
        missedPitcherData[playerName].BB += record.walks || 0
        
        if (record.record === 'W') missedPitcherData[playerName].W += 1
        if (record.record === 'L') missedPitcherData[playerName].L += 1
        if (record.record === 'H') missedPitcherData[playerName].HLD += 1
        if (record.record === 'S') missedPitcherData[playerName].SV += 1
        if (ip >= 6 && record.earned_runs <= 3) missedPitcherData[playerName].QS += 1
      }
    })

    // 6. 轉換為表格格式並計算衍生數據
    const missedBatterRows = []
    let batterTotalSum = { AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, BB: 0, GIDP: 0, XBH: 0, TB: 0 }

    Object.entries(missedBatterData).forEach(([name, stats]) => {
      const AB = stats.AB || 0
      const rawAVG = AB ? stats.H / AB : 0
      const AVG = rawAVG.toFixed(3).replace(/^0\./, '.')
      
      const OBP = (AB + stats.BB) ? ((stats.H + stats.BB) / (AB + stats.BB)) : 0
      const SLG = AB ? stats.TB / AB : 0
      const rawOPS = OBP + SLG
      const OPS = rawOPS.toFixed(3).replace(/^0\./, '.')

      missedBatterRows.push({
        Name: name,
        AB: stats.AB,
        R: stats.R,
        H: stats.H,
        HR: stats.HR,
        RBI: stats.RBI,
        SB: stats.SB,
        K: stats.K,
        BB: stats.BB,
        GIDP: stats.GIDP,
        XBH: stats.XBH,
        TB: stats.TB,
        AVG,
        OPS
      })

      // 累加總計
      Object.keys(batterTotalSum).forEach(key => {
        batterTotalSum[key] += stats[key]
      })
    })

    // 計算總計的 AVG 和 OPS
    const totalAB = batterTotalSum.AB || 0
    const rawTotalAVG = totalAB ? batterTotalSum.H / totalAB : 0
    const totalAVG = rawTotalAVG.toFixed(3).replace(/^0\./, '.')
    
    const totalOBP = (totalAB + batterTotalSum.BB) ? 
      ((batterTotalSum.H + batterTotalSum.BB) / (totalAB + batterTotalSum.BB)) : 0
    const totalSLG = totalAB ? batterTotalSum.TB / totalAB : 0
    const rawTotalOPS = totalOBP + totalSLG
    const totalOPS = rawTotalOPS.toFixed(3).replace(/^0\./, '.')

    // 加入總計行
    missedBatterRows.push({
      Name: '總計',
      AB: batterTotalSum.AB,
      R: batterTotalSum.R,
      H: batterTotalSum.H,
      HR: batterTotalSum.HR,
      RBI: batterTotalSum.RBI,
      SB: batterTotalSum.SB,
      K: batterTotalSum.K,
      BB: batterTotalSum.BB,
      GIDP: batterTotalSum.GIDP,
      XBH: batterTotalSum.XBH,
      TB: batterTotalSum.TB,
      AVG: totalAVG,
      OPS: totalOPS
    })

    const missedPitcherRows = []
    let pitcherTotalSum = { OUT: 0, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0 }

    Object.entries(missedPitcherData).forEach(([name, stats]) => {
      const IP = stats.OUT / 3 || 0
      const ERA = IP ? (9 * stats.ER / IP).toFixed(2) : '0.00'
      const WHIP = IP ? ((stats.H + stats.BB) / IP).toFixed(2) : '0.00'

      missedPitcherRows.push({
        Name: name,
        IP: `${Math.floor(IP)}.${stats.OUT % 3}`,
        W: stats.W,
        L: stats.L,
        HLD: stats.HLD,
        SV: stats.SV,
        H: stats.H,
        ER: stats.ER,
        K: stats.K,
        BB: stats.BB,
        QS: stats.QS,
        OUT: stats.OUT,
        ERA,
        WHIP
      })

      // 累加總計
      Object.keys(pitcherTotalSum).forEach(key => {
        pitcherTotalSum[key] += stats[key]
      })
    })

    // 計算總計的 ERA 和 WHIP
    const totalIP = pitcherTotalSum.OUT / 3 || 0
    const totalERA = totalIP ? (9 * pitcherTotalSum.ER / totalIP).toFixed(2) : '0.00'
    const totalWHIP = totalIP ? ((pitcherTotalSum.H + pitcherTotalSum.BB) / totalIP).toFixed(2) : '0.00'

    // 加入總計行
    missedPitcherRows.push({
      Name: '總計',
      IP: `${Math.floor(totalIP)}.${pitcherTotalSum.OUT % 3}`,
      W: pitcherTotalSum.W,
      L: pitcherTotalSum.L,
      HLD: pitcherTotalSum.HLD,
      SV: pitcherTotalSum.SV,
      H: pitcherTotalSum.H,
      ER: pitcherTotalSum.ER,
      K: pitcherTotalSum.K,
      BB: pitcherTotalSum.BB,
      QS: pitcherTotalSum.QS,
      OUT: pitcherTotalSum.OUT,
      ERA: totalERA,
      WHIP: totalWHIP
    })

    console.log(`🔍 錯失數據統計: ${missedBatterRows.length-1} 位打者, ${missedPitcherRows.length-1} 位投手`)

    return NextResponse.json({ 
      missedBatterRows, 
      missedPitcherRows,
      summary: {
        totalMissedBatters: missedBatterRows.length - 1,
        totalMissedPitchers: missedPitcherRows.length - 1
      }
    })
  } catch (err) {
    console.error('❌ 季後賽錯失數據錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
