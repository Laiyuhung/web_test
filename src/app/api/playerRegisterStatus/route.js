import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

const cleanName = (name) => name?.replace(/[◎#*]/g, '').trim()

export async function GET() {
  // 1. 撈出四張資料表
  const [{ data: registerlist }, { data: start_major }, { data: movements }, { data: players }] = await Promise.all([
    supabase.from('registerlist').select('Player_no'),
    supabase.from('start_major').select('Player_no'),
    supabase.from('player_movements').select('name, action'),
    supabase.from('playerslist').select('player_no, name')
  ])

  // 2. 建立 Player_no → cleaned name 對照表
  const playerNoToName = {}
  players.forEach(p => {
    const cleaned = cleanName(p.name)
    playerNoToName[p.player_no] = cleaned
  })

  // 3. 建立註冊名單（開季註冊 + 新註冊）
  const registeredNames = new Set()
  registerlist.forEach(row => {
    const name = playerNoToName[row.Player_no]
    if (name) registeredNames.add(name)
  })

  movements.forEach(row => {
    const cleaned = cleanName(row.name)
    if (row.action === '新註冊') {
      registeredNames.add(cleaned)
    }
  })

  // 4. 建立註銷名單
  const canceledNames = new Set()
  movements.forEach(row => {
    const cleaned = cleanName(row.name)
    if (row.action === '註冊註銷' || row.action === '除役') {
      canceledNames.add(cleaned)
    }
  })

  // 5. 統計升/降次數
  const statusCount = {}
  const allNames = new Set()

  movements.forEach(row => {
    const cleaned = cleanName(row.name)
    allNames.add(cleaned)
    if (!statusCount[cleaned]) statusCount[cleaned] = { up: 0, down: 0 }
    if (row.action === '升一軍') statusCount[cleaned].up++
    if (row.action === '降二軍') statusCount[cleaned].down++
  })

  // 6. 把開季一軍也當成升一軍
  start_major.forEach(row => {
    const name = playerNoToName[row.Player_no]
    if (!name) return
    allNames.add(name)
    if (!statusCount[name]) statusCount[name] = { up: 0, down: 0 }
    statusCount[name].up++
  })

  // 7. 整合狀態
  const result = Array.from(allNames).map(name => {
    if (canceledNames.has(name)) return { name, status: '註銷' }
    if (!registeredNames.has(name)) return { name, status: '未註冊' }

    const { up = 0, down = 0 } = statusCount[name] || {}
    const active = up > down ? '一軍' : '二軍'
    return { name, status: active }
  })

  return NextResponse.json(result)
}
