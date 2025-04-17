import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const manager_id = searchParams.get('manager_id')

  console.log('📥 [loadForRoster] date:', date, 'manager_id:', manager_id)

  if (!date || !manager_id) {
    console.log('❌ 缺少 date 或 manager_id')
    return NextResponse.json({ error: '缺少 date 或 manager_id' }, { status: 400 })
  }

  // Step 1: assigned_position_history
  const { data: assigned, error: assignedError } = await supabase
    .from('assigned_position_history')
    .select('player_name, position')
    .eq('date', date)
    .eq('manager_id', manager_id)

  if (assignedError) {
    console.log('❌ assigned_position_history 錯誤:', assignedError)
    return NextResponse.json({ error: '讀取失敗', detail: assignedError }, { status: 500 })
  }

  console.log('✅ Step 1: assigned_position_history', assigned)

  const playerNames = assigned.map(r => r.player_name)

  // Step 2: playerslist
  const { data: basic, error: basicError } = await supabase
    .from('playerslist')
    .select('Name, Team, B_or_P, identity')
    .in('Name', playerNames)

  if (basicError) {
    console.log('❌ playerslist 錯誤:', basicError)
    return NextResponse.json({ error: 'playerslist 錯誤', detail: basicError }, { status: 500 })
  }
  console.log('✅ Step 2: playerslist', basic)

  // Step 3: player_register_status
  const { data: register, error: registerError } = await supabase
    .from('registerlist')
    .select('name, status')
    .in('name', playerNames)

  if (registerError) {
    console.log('❌ player_register_status 錯誤:', registerError)
    return NextResponse.json({ error: 'player_register_status 錯誤', detail: registerError }, { status: 500 })
  }
  console.log('✅ Step 3: register_status', register)



  // Step 4: player_position_caculate
  const cleanName = (name) => name?.replace(/[◎#*]/g, '').trim()
    const validPositions = ['C', '1B', '2B', '3B', 'SS', 'OF']
    const isValidPosition = (p) => validPositions.includes(p)

    // 撈出 position2024、batting_stats、pitching_stats
    const [{ data: posTable }, { data: battingStats }, { data: pitchingStats }] = await Promise.all([
    supabase.from('position2024').select('Player_no, Position'),
    supabase.from('batting_stats').select('name, position').eq('game_date', date),
    supabase.from('pitching_stats').select('name, sequence').eq('game_date', date),
    ])

    // name ↔ player_no 對照表
    const nameToPlayerNo = {}
    const playerNoToName = {}
    const playerNoToType = {}
    basic.forEach(p => {
    const cleaned = cleanName(p.Name)
    nameToPlayerNo[cleaned] = p.Player_no
    playerNoToName[p.Player_no] = p.Name
    playerNoToType[p.Player_no] = p.B_or_P
    })

    // 靜態守位（position2024）
    const staticPositions = {}
    posTable.forEach(row => {
    const raw = row.Position?.split(',').map(p => p.trim()).filter(Boolean) || []
    const playerNo = row.Player_no
    const type = playerNoToType[playerNo]
    if (!type) return

    let mapped
    if (type === 'Batter') {
        mapped = raw.map(p => isValidPosition(p) ? p : 'Util')
        const hasValid = mapped.some(p => validPositions.includes(p))
        if (!hasValid) mapped.push('Util')
    } else {
        mapped = raw.includes('SP') || raw.includes('RP')
        ? raw.filter(p => ['SP', 'RP'].includes(p))
        : ['P']
    }

    staticPositions[playerNo] = Array.from(new Set(mapped))
    })

    // 出賽位置：打者（打過哪個守位幾次）
    const batterGamePosition = {}
    battingStats.forEach(row => {
    const cleaned = cleanName(row.name)
    const playerNo = nameToPlayerNo[cleaned]
    if (!playerNo || !Array.isArray(row.position)) return
    if (!batterGamePosition[playerNo]) batterGamePosition[playerNo] = {}
    row.position.forEach(pos => {
        const p = isValidPosition(pos) ? pos : 'Util'
        batterGamePosition[playerNo][p] = (batterGamePosition[playerNo][p] || 0) + 1
    })
    })

    // 出賽次數：投手（SP or RP）
    const pitcherGameCounts = {}
    pitchingStats.forEach(row => {
    const cleaned = cleanName(row.name)
    const playerNo = nameToPlayerNo[cleaned]
    if (!playerNo) return
    if (!pitcherGameCounts[playerNo]) pitcherGameCounts[playerNo] = { SP: 0, RP: 0 }
    if (row.sequence === 1) {
        pitcherGameCounts[playerNo].SP++
    } else {
        pitcherGameCounts[playerNo].RP++
    }
    })

    // 最終位置合成
    const nameToFinalPosition = {}

    playerNames.forEach(name => {
    const cleaned = cleanName(name)
    const playerNo = nameToPlayerNo[cleaned]
    const type = playerNoToType[playerNo]
    const finalPos = new Set(staticPositions[playerNo] || [])

    if (type === 'Batter') {
        const stats = batterGamePosition[playerNo] || {}
        for (const pos in stats) {
        if (stats[pos] >= 8) finalPos.add(pos)
        }
        const hasValid = [...finalPos].some(p => validPositions.includes(p))
        if (!hasValid) finalPos.add('Util')
        if (finalPos.has('Util') && hasValid) finalPos.delete('Util')

    } else if (type === 'Pitcher') {
        const stat = pitcherGameCounts[playerNo] || {}
        if (stat.SP >= 3) finalPos.add('SP')
        if (stat.RP >= 2) finalPos.add('RP')

        if ((finalPos.has('SP') || finalPos.has('RP')) && finalPos.has('P')) {
        finalPos.delete('P')
        }
        if (!finalPos.has('SP') && !finalPos.has('RP')) {
        finalPos.add('P')
        }
    }

    nameToFinalPosition[name] = Array.from(finalPos)
    })

    console.log('✅ Step 4: nameToFinalPosition', nameToFinalPosition)


  // Step 5: batting_stats（僅撈一軍）
const { data: batterStats } = await supabase
.from('batting_stats')
.select()
.eq('game_date', date)
.eq('is_major', true)  // ✅ 僅限一軍
.in('name', playerNames)
console.log('✅ Step 5: batterStats', batterStats)

// Step 6: pitching_stats（僅撈一軍）
const { data: pitcherStats } = await supabase
.from('pitching_stats')
.select()
.eq('game_date', date)
.eq('is_major', true)  // ✅ 僅限一軍
.in('name', playerNames)
console.log('✅ Step 6: pitcherStats', pitcherStats)

  // Step 7: 整合每位球員資料
  const merged = []

  for (const row of assigned) {
    const name = row.player_name

    const base = basic.find(p => p.Name === name) || {}
    const reg = register.find(p => p.name === name) || {}
    const pos = posData.find(p => p.name === name) || {}
    const batter = batterStats.find(s => s.name === name)
    const pitcher = pitcherStats.find(s => s.name === name)

    const stats = batter || pitcher || {}

    const result = {
      name,
      position: row.position,
      team: base.Team || '',
      type: base.B_or_P || '',
      identity: base.identity || '',
      registerStatus: reg.status || '未註冊',
      finalPosition: nameToFinalPosition[name] || [],
      stats
    }

    console.log('🧩 整合:', result)
    merged.push(result)
  }

  return NextResponse.json(merged)
}
