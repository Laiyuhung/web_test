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
      .order('player_name', { ascending: true }) // 也可換成 id 或 created_at，需視你的表而定
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
    let { week } = await req.json()
    week = week?.trim()
    if (!week) return NextResponse.json({ error: '缺少 week 參數' }, { status: 400 })

    console.log('🔍 查找參數:', { week });

    const { data: weekData } = await supabase
      .from('schedule_date')
      .select('*')
      .eq('week', week)
      .single()
    console.log('📋 schedule_date 查找結果:', weekData);

    if (!weekData) return NextResponse.json({ error: '查無週次資料' }, { status: 404 })

    const { start, end } = weekData

    const assigned = await fetchAllAssignedPositionHistory(start, end);
    console.log('📋 assigned_position_history 查找數量:', assigned.length);

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
    console.log('📋 playerslist 查找數量:', playerTypes.length);

    const typeMap = Object.fromEntries(playerTypes.map(p => [p.Name, p.B_or_P]))

    const batStats = await fetchAllBattingStats(start, end);
    console.log('📋 batting_stats 查找數量:', batStats.length);

    const pitStats = await fetchAllPitchingStats(start, end);
    console.log('📋 pitching_stats 查找數量:', pitStats.length);

    const result = []
    const allManagerIds = [1, 2, 3, 4]

    for (const managerId of allManagerIds) {
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
              batterSum.XBH +=  ((r.doubles || 0) + (r.triples || 0) + (r.home_runs || 0))
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
          batters: { ...batterSum, AVG, OPS, fantasyPoints: {} },     // 加上空殼
          pitchers: { ...pitcherSum, ERA, WHIP, IP: `${Math.floor(IP)}.${pitcherSum.OUT % 3}`, fantasyPoints: {} }
        })
    }

    const allStats = [
      'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS',
      'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'
    ]

    const batterStats = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']

    for (const stat of batterStats) {
      const isLowerBetter = ['K', 'GIDP'].includes(stat)

      const values = result.map(r => ({
        team: r.team_name,
        value: isNaN(r.batters[stat]) ? 0 : parseFloat(r.batters[stat]),
      }))

      values.sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value)
      console.log(`📊 [打者] 排名計算 - ${stat}:`, values)

      let i = 0
      const scores = {}
      while (i < values.length) {
        let j = i
        while (j + 1 < values.length && values[j + 1].value === values[i].value) j++
        const total = [...Array(j - i + 1)].reduce((sum, _, k) => sum + (4 - i - k), 0)
        const avg = total / (j - i + 1)
        for (let k = i; k <= j; k++) {
          scores[values[k].team] = avg
        }
        i = j + 1
      }

      result.forEach(r => {
        if (!r.batters.fantasyPoints) r.batters.fantasyPoints = {}
        r.batters.fantasyPoints[stat] = parseFloat(scores[r.team_name]?.toFixed(1) || '0.0')
      })
    }

    const pitcherStats = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
    const pitcherLowerBetter = ['L', 'H', 'ER', 'BB', 'ERA', 'WHIP']

    for (const stat of pitcherStats) {
      const isLowerBetter = pitcherLowerBetter.includes(stat)

      const values = result.map(r => ({
        team: r.team_name,
        value: isNaN(r.pitchers[stat]) ? 0 : parseFloat(r.pitchers[stat]),
      }))

      values.sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value)
      console.log(`📊 [投手] 排名計算 - ${stat}:`, values)

      let i = 0
      const scores = {}
      while (i < values.length) {
        let j = i
        while (j + 1 < values.length && values[j + 1].value === values[i].value) j++
        const total = [...Array(j - i + 1)].reduce((sum, _, k) => sum + (4 - i - k), 0)
        const avg = total / (j - i + 1)
        for (let k = i; k <= j; k++) {
          scores[values[k].team] = avg
        }
        i = j + 1
      }

      result.forEach(r => {
        if (!r.pitchers.fantasyPoints) r.pitchers.fantasyPoints = {}
        r.pitchers.fantasyPoints[stat] = parseFloat(scores[r.team_name]?.toFixed(1) || '0.0')
      })
    }

    result.forEach(r => {
      const batterTotal = Object.values(r.batters.fantasyPoints || {}).reduce((a, b) => a + b, 0)
      const pitcherTotal = Object.values(r.pitchers.fantasyPoints || {}).reduce((a, b) => a + b, 0)
      r.fantasyPoints = {
        Total: (batterTotal + pitcherTotal).toFixed(1)
      }
    })

    // === 新增：檢查是否為過去週次，並修正 IP 未達 30 局的隊伍分數 ===
    // 1. 判斷是否為過去週次（不是本週）
    const isPastWeek = (() => {
      // W18 一律視為非賽事期間
      // if (week === 'W18') return true;
      // 取得今天日期
      const today = new Date().toISOString().slice(0, 10);
      // 本週區間
      if (weekData && weekData.start && weekData.end) {
        return today < weekData.start || today > weekData.end;
      }
      return false;
    })();

    // 2. 檢查是否為過去週次
    if (isPastWeek) {
      // 只針對 W1~W17 處理 IP 未達 30 局
      // 先收集所有隊伍的 IP
      const teamIPs = result.map(r => ({
        team: r.team_name,
        ip: parseFloat(r.pitchers.IP)
      }));
      // 找出未達 30 局的隊伍
      const under30 = teamIPs.filter(t => t.ip < 30);
      if (under30.length > 0) {
        // 找出所有隊伍的投手 fantasyPoints 總分
        const pitcherTotals = result.map(r => {
          const pts = Object.values(r.pitchers.fantasyPoints || {}).reduce((a, b) => a + b, 0);
          return { team: r.team_name, pts };
        });
        // 找出最低分
        const minTotal = Math.min(...pitcherTotals.map(p => p.pts));
        // 平分最低分
        const share = minTotal / under30.length;
        // 修正未達標隊伍的投手分數
        result.forEach(r => {
          if (under30.some(t => t.team === r.team_name)) {
            // 每個投手項目都設為 0，Total 設為 share
            Object.keys(r.pitchers.fantasyPoints).forEach(k => {
              r.pitchers.fantasyPoints[k] = 0;
            });
            // 只給一個項目設 share，其他 0（或全部平均分配，依你規則）
            r.pitchers.fantasyPoints['IP'] = parseFloat(share.toFixed(1));
          }
        });
        // 重新計算 fantasyPoints.Total
        result.forEach(r => {
          const batterTotal = Object.values(r.batters.fantasyPoints || {}).reduce((a, b) => a + b, 0);
          const pitcherTotal = Object.values(r.pitchers.fantasyPoints || {}).reduce((a, b) => a + b, 0);
          r.fantasyPoints = {
            Total: (batterTotal + pitcherTotal).toFixed(1)
          };
        });
      }
    }


    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ weekSummary 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
