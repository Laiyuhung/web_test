import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

function cleanName(name) {
  return (name || '').replace(/[#◎＊*]/g, '').trim()
}
async function fetchAll(tableName, columns, whereFn = null) {
  const pageSize = 1000
  let allData = []
  let page = 0
  let done = false

  while (!done) {
    let query = supabase.from(tableName).select(columns)
    if (whereFn) query = whereFn(query)
    query = query.range(page * pageSize, (page + 1) * pageSize - 1)

    const { data, error } = await query
    if (error) throw new Error(`❌ 讀取 ${tableName} 失敗: ${error.message}`)

    console.log(`📄 ${tableName} 第 ${page + 1} 頁，拿到 ${data.length} 筆`)
    allData = allData.concat(data)

    if (data.length < pageSize) {
      done = true
    } else {
      page++
    }
  }

  console.log(`✅ ${tableName} 全部讀取完成，共 ${allData.length} 筆`)
  return allData
}

// 分頁查詢，直到撈到完
async function fetchAllStats(tableName, from, to) {
  const pageSize = 1000
  let allData = []
  let page = 0
  let done = false

  while (!done) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('is_major', true)
      .gte('game_date', from)
      .lte('game_date', to)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw new Error(error.message)

    console.log(`📄 第 ${page + 1} 頁，拿到 ${data.length} 筆`)
    allData = allData.concat(data)

    if (data.length < pageSize) {
      done = true // 最後一頁了
    } else {
      page++
    }
  }

  console.log('📊 全部查詢完成，總筆數:', allData.length)
  return allData
}

export async function POST(req) {
  try {
    const { type, from, to } = await req.json()

    if (!type || !from || !to) {
      console.error('❌ 缺少參數:', { type, from, to })
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    console.log('📥 接收到:', { type, from, to })

    // 撈 playerslist
    const playerList = await fetchAll(
      'playerslist',
      'Name, B_or_P',
      q => q.eq('Available', 'V')
    )
    

    if (playerError) {
      console.error('❌ 撈取 playerslist 失敗:', playerError)
      return NextResponse.json({ error: playerError.message }, { status: 500 })
    }

    const filteredPlayers = (playerList || []).filter(p =>
      (p.B_or_P || '').toLowerCase() === (type === 'batter' ? 'batter' : 'pitcher')
    )

    if (filteredPlayers.length === 0) {
      console.log('⚠️ 找不到符合類型的球員')
      return NextResponse.json({ error: '找不到符合類型的球員' }, { status: 400 })
    }

    console.log('✅ 撈到符合球員數:', filteredPlayers.length)

    // 用分頁方式撈成績表
    const statsData = await fetchAllStats(
      type === 'batter' ? 'batting_stats' : 'pitching_stats',
      from,
      to
    )

    // 整理 statsData，每一筆加上 cleanName
    const cleanStats = (statsData || []).map(row => ({
      ...row,
      cleanName: cleanName(row.name || row.player_name)
    }))

    const result = []

    // 一個一個 player 跑
    for (const player of filteredPlayers) {
      const rawName = player.Name
      const playerCleanName = cleanName(rawName)
      const playerRows = cleanStats.filter(r => r.cleanName === playerCleanName)

      if (playerRows.length === 0) {
        console.log(`⚠️ ${rawName} 查無資料，回傳 0`)
        result.push(type === 'batter'
          ? { name: rawName, AB: 0, R: 0, H: 0, HR: 0, RBI: 0, SB: 0, K: 0, GIDP: 0, XBH: 0, TB: 0, BB: 0, HBP: 0, SF: 0, AVG: "0.000", OPS: "0.000" }
          : { name: rawName, W: 0, L: 0, HLD: 0, SV: 0, H: 0, ER: 0, K: 0, BB: 0, QS: 0, IP: "0.0", ERA: "0.00", WHIP: "0.00" }
        )
        continue
      }

      if (type === 'batter') {
        let AB = 0, R = 0, H = 0, HR = 0, RBI = 0, SB = 0, K = 0, GIDP = 0, XBH = 0, TB = 0, BB = 0, HBP = 0, SF = 0
        for (const row of playerRows) {
          AB += row.at_bats || 0
          R += row.runs || 0
          H += row.hits || 0
          HR += row.home_runs || 0
          RBI += row.rbis || 0
          SB += row.stolen_bases || 0
          K += row.strikeouts || 0
          GIDP += row.double_plays || 0
          XBH += (row.doubles || 0) + (row.triples || 0) + (row.home_runs || 0)
          TB += (row.hits - row.doubles - row.triples - row.home_runs || 0)
            + (row.doubles || 0) * 2 + (row.triples || 0) * 3 + (row.home_runs || 0) * 4
          BB += row.walks || 0
          HBP += row.hit_by_pitch || 0
          SF += row.sacrifice_flies || 0
        }
        const OBP_den = AB + BB + HBP + SF
        const OBP = OBP_den ? (H + BB + HBP) / OBP_den : 0
        const SLG = AB ? TB / AB : 0
        const AVG = AB ? H / AB : 0
        result.push({
          name: rawName, AB, R, H, HR, RBI, SB, K, GIDP, XBH, TB, BB, HBP, SF,
          AVG: AVG.toFixed(3),
          OPS: (OBP + SLG).toFixed(3)
        })
      } else {
        let W = 0, L = 0, HLD = 0, SV = 0, H = 0, ER = 0, K = 0, BB = 0, QS = 0, OUT = 0
        for (const row of playerRows) {
          const rawIP = row.innings_pitched || 0
          const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)
          OUT += outs
          H += row.hits_allowed || 0
          ER += row.earned_runs || 0
          K += row.strikeouts || 0
          BB += row.walks || 0
          if (row.record === 'W') W++
          if (row.record === 'L') L++
          if (row.record === 'H') HLD++
          if (row.record === 'S') SV++
          if (rawIP >= 6 && row.earned_runs <= 3) QS++
        }
        const IP_raw = OUT / 3
        const ERA = IP_raw ? (9 * ER / IP_raw) : 0
        const WHIP = IP_raw ? (BB + H) / IP_raw : 0
        result.push({
          name: rawName, W, L, HLD, SV, H, ER, K, BB, QS,
          IP: formatIP(OUT),
          ERA: ERA.toFixed(2),
          WHIP: WHIP.toFixed(2)
        })
      }
    }

    console.log('✅ 全部統計完畢，球員數:', result.length)
    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ summary 錯誤:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
