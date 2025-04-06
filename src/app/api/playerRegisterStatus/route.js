import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

// 清除特殊符號
const cleanName = (name) => name?.replace(/[◎#*]/g, '').trim()

export async function GET() {
  // 1. 撈資料表
  const [{ data: registerlist }, { data: start_major }, { data: movements }, { data: players }] = await Promise.all([
    supabase.from('registerlist').select('Player_no'),
    supabase.from('start_major').select('Player_no'),
    supabase.from('player_movements').select('name, action'),
    supabase.from('playerslist').select('Player_no, Name')
  ])

  // 2. 編號對名字
  const playerNoToName = {}
  players.forEach(p => {
    const cleaned = cleanName(p.Name)
    playerNoToName[p.Player_no] = cleaned
  })

  // 3. 註冊名單：registerlist + 新註冊
  const registeredNames = new Set()
  registerlist.forEach(row => {
    const name = playerNoToName[row.Player_no]
    if (name) registeredNames.add(name)
  })

  movements.forEach(row => {
    const name = cleanName(row.name)
    if (row.action === '新註冊') registeredNames.add(name)
  })

  // 4. 註銷名單
  const canceledNames = new Set()
  movements.forEach(row => {
    const name = cleanName(row.name)
    if (row.action === '註冊註銷' || row.action === '除役') canceledNames.add(name)
  })

  // 5. 升降次數統計
  const statusCount = {}
  const allNames = new Set()

  movements.forEach(row => {
    const name = cleanName(row.name)
    allNames.add(name)
    if (!statusCount[name]) statusCount[name] = { up: 0, down: 0 }
    if (row.action === '升一軍') statusCount[name].up++
    if (row.action === '降二軍') statusCount[name].down++
  })

  // 6. 開季一軍也算一次升
  start_major.forEach(row => {
    const name = playerNoToName[row.Player_no]
    if (!name) return
    allNames.add(name)
    if (!statusCount[name]) statusCount[name] = { up: 0, down: 0 }
    statusCount[name].up++
  })

  // 7. 收集所有出現在 registerlist 的人
  registerlist.forEach(row => {
    const name = playerNoToName[row.Player_no]
    if (name) allNames.add(name)
  })

  // 8. 整合最終狀態
  const result = Array.from(allNames).map(name => {
    if (canceledNames.has(name)) {
      return { name, status: '註銷' }
    }

    if (!registeredNames.has(name)) {
      return { name, status: '未註冊' }
    }

    const { up = 0, down = 0 } = statusCount[name] || {}
    if (up > down) {
      return { name, status: '一軍' }
    } else {
      return { name, status: '二軍' }
    }
  })

  return NextResponse.json(result)
}
