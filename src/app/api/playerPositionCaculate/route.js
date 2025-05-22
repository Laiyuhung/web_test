import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

const cleanName = (name) => name?.replace(/[◎#*]/g, '').trim()
const validPositions = ['C', '1B', '2B', '3B', 'SS', 'OF']
const isValidPosition = (p) => validPositions.includes(p)

async function fetchAll(tableName, columns, where = null) {
  const pageSize = 1000
  let allData = []
  let page = 0
  let done = false

  while (!done) {
    let query = supabase.from(tableName).select(columns)

    // 加上 where 條件（例如 .eq('Available', 'V')）
    if (where) query = where(query);

    // 對 batting_stats 和 pitching_stats 的 id 進行排序
    if (tableName === 'batting_stats' || tableName === 'pitching_stats') {
      query = query.order('id', { ascending: true });
    }

    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error } = await query

    if (error) throw new Error(error.message)

    console.log(`📄 ${tableName} 第 ${page + 1} 頁，拿到 ${data.length} 筆`)
    allData = allData.concat(data)

    if (data.length < pageSize) {
      done = true
    } else {
      page++
    }
  }

  console.log(`✅ ${tableName} 全部拿完，總筆數:`, allData.length)
  return allData
}

export async function GET() {
  const [players, posTable, batting, pitching] = await Promise.all([
    fetchAll('playerslist', 'Player_no, Name, B_or_P', q => q.eq('Available', 'V')),
    fetchAll('position2024', 'Player_no, Position'),
    fetchAll('batting_stats', 'name, position'),
    fetchAll('pitching_stats', 'name, sequence')
  ])

  const nameToPlayerNo = {}
  const playerNoToInfo = {}
  players.forEach(p => {
    const cleaned = cleanName(p.Name)
    nameToPlayerNo[cleaned] = p.Player_no
    playerNoToInfo[p.Player_no] = {
      name: p.Name,
      B_or_P: p.B_or_P
    }
  })

  const staticPositions = {}
  posTable.forEach(row => {
    const raw = row.Position?.split(',').map(p => p.trim()).filter(Boolean) || []
    const player = playerNoToInfo[row.Player_no]
    if (!player) return

    let mapped
    if (player.B_or_P === 'Batter') {
      mapped = raw.map(p => isValidPosition(p) ? p : 'Util')
      const hasValid = mapped.some(p => validPositions.includes(p))
      if (!hasValid) mapped.push('Util')
    } else {
      mapped = raw.includes('SP') || raw.includes('RP')
        ? raw.filter(p => ['SP', 'RP'].includes(p))
        : ['P']
    }

    staticPositions[row.Player_no] = Array.from(new Set(mapped))
  })

  const batterStats = {}
  batting.forEach(row => {
    const cleaned = cleanName(row.name)
    const playerNo = nameToPlayerNo[cleaned]
    if (!playerNo) return

    let positions
    try {
      positions = JSON.parse(row.position)
      if (!Array.isArray(positions)) return
    } catch (e) {
      return
    }

    if (!batterStats[playerNo]) batterStats[playerNo] = {}
    positions.forEach(pos => {
      // ✅ 轉換 LF/CF/RF 為 OF
      let mappedPos = ['LF', 'CF', 'RF'].includes(pos) ? 'OF' : pos
      const p = isValidPosition(mappedPos) ? mappedPos : 'Util'
      batterStats[playerNo][p] = (batterStats[playerNo][p] || 0) + 1
    })
  })

  const pitcherStats = {}
  pitching.forEach(row => {
    const cleaned = cleanName(row.name)
    const playerNo = nameToPlayerNo[cleaned]
    if (!playerNo) return
    if (!pitcherStats[playerNo]) pitcherStats[playerNo] = { SP: 0, RP: 0 }
    if (row.sequence === 1) {
      pitcherStats[playerNo].SP++
    } else {
      pitcherStats[playerNo].RP++
    }
  })

  console.log('📋 每位球員的出場統計：')

  // 打者個別統計
  Object.entries(batterStats).forEach(([playerNo, posStats]) => {
    const playerName = playerNoToInfo[playerNo]?.name || '(unknown)'
    const detail = Object.entries(posStats)
      .map(([pos, count]) => `${pos}: ${count}`)
      .join(', ')
    console.log(`🔵 ${playerName}（打者）：${detail}`)
  })

// 投手個別統計
// Object.entries(pitcherStats).forEach(([playerNo, stat]) => {
//   const playerName = playerNoToInfo[playerNo]?.name || '(unknown)'
//   const details = []
//   if (stat.SP) details.push(`SP: ${stat.SP}`)
//   if (stat.RP) details.push(`RP: ${stat.RP}`)
//   const detail = details.join(', ')
//   console.log(`🔴 ${playerName}（投手）：${detail}`)
// })


  const results = Object.entries(playerNoToInfo).map(([playerNo, info]) => {
    const finalPos = new Set(staticPositions[playerNo] || [])

    if (info.B_or_P === 'Batter') {
      const stats = batterStats[playerNo] || {}
      for (const pos in stats) {
        if (stats[pos] >= 8) finalPos.add(pos)
      }

      const hasValid = [...finalPos].some(p => validPositions.includes(p))
      if (!hasValid) finalPos.add('Util')
      if (finalPos.has('Util') && hasValid) finalPos.delete('Util')

    } else if (info.B_or_P === 'Pitcher') {
      const stat = pitcherStats[playerNo] || {}

      if (stat.SP >= 3) finalPos.add('SP')
      if (stat.RP >= 2) finalPos.add('RP')

      if ((finalPos.has('SP') || finalPos.has('RP')) && finalPos.has('P')) {
        finalPos.delete('P')
      }

      if (!finalPos.has('SP') && !finalPos.has('RP')) {
        finalPos.add('P')
      }
    }

    const orderedFinalPos = Array.from(finalPos).sort(
      (a, b) => desiredOrder.indexOf(a) - desiredOrder.indexOf(b)
    )

    return {
      player_no: playerNo,
      name: info.name,
      B_or_P: info.B_or_P,
      finalPosition: orderedFinalPos
    }

  })

  return NextResponse.json(results)
}
