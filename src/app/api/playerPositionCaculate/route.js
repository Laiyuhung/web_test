import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

const cleanName = (name) => name?.replace(/[◎#*]/g, '').trim()
const validPositions = ['C', '1B', '2B', '3B', 'SS', 'OF']
const isValidPosition = (p) => validPositions.includes(p)

export async function GET() {
  const [{ data: players }, { data: posTable }, { data: batting }, { data: pitching }] = await Promise.all([
    supabase.from('playerslist').select('Player_no, Name, B_or_P'),
    supabase.from('position2024').select('Player_no, Position'),
    supabase.from('batting_stats').select('name, position'),
    supabase.from('pitching_stats').select('name, sequence')
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
    const mapped = raw.map(p => isValidPosition(p) ? p : 'Util')
    staticPositions[row.Player_no] = Array.from(new Set(mapped))
  })

  const batterStats = {}
  batting.forEach(row => {
    const cleaned = cleanName(row.player_name)
    const playerNo = nameToPlayerNo[cleaned]
    if (!playerNo || !Array.isArray(row.position)) return
    if (!batterStats[playerNo]) batterStats[playerNo] = {}
    row.position.forEach(pos => {
      const p = isValidPosition(pos) ? pos : 'Util'
      batterStats[playerNo][p] = (batterStats[playerNo][p] || 0) + 1
    })
  })

  const pitcherStats = {}
  pitching.forEach(row => {
    const cleaned = cleanName(row.player_name)
    const playerNo = nameToPlayerNo[cleaned]
    if (!playerNo) return
    if (!pitcherStats[playerNo]) pitcherStats[playerNo] = { SP: 0, RP: 0 }
    if (row.sequence === 1) {
      pitcherStats[playerNo].SP++
    } else {
      pitcherStats[playerNo].RP++
    }
  })

  const results = Object.entries(playerNoToInfo).map(([playerNo, info]) => {
    const finalPos = new Set(staticPositions[playerNo] || [])

    if (info.B_or_P === 'Batter') {
      const stats = batterStats[playerNo] || {}
      for (const pos in stats) {
        if (stats[pos] >= 8) finalPos.add(pos)
      }

      // 若沒有合法守位，補上 Util
      const hasValid = [...finalPos].some(p => validPositions.includes(p))
      if (!hasValid) finalPos.add('Util')
    } else {
      const stat = pitcherStats[playerNo] || {}

      if (stat.SP >= 3) finalPos.add('SP')
      if (stat.RP >= 2) finalPos.add('RP')

      // 有 SP/RP 就移除靜態的 P
      if ((finalPos.has('SP') || finalPos.has('RP')) && finalPos.has('P')) {
        finalPos.delete('P')
      }

      // 沒有 SP/RP 才補上 P
      if (!finalPos.has('SP') && !finalPos.has('RP')) {
        finalPos.add('P')
      }
    }

    // 如果同時有合法守位與 Util，就移除 Util
    if (finalPos.has('Util') && [...finalPos].some(p => validPositions.includes(p))) {
      finalPos.delete('Util')
    }

    return {
      player_no: playerNo,
      name: info.name,
      B_or_P: info.B_or_P,
      finalPosition: Array.from(finalPos)
    }
  })

  return NextResponse.json(results)
}
