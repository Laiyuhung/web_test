import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

// 清除特殊符號
const cleanName = (name) => name?.replace(/[◎#*]/g, '').trim()

async function fetchAll(tableName, columns, whereFn = null) {
  const pageSize = 1000
  let allData = []
  let page = 0
  let done = false

  while (!done) {
    let query = supabase.from(tableName).select(columns);

    if (whereFn) query = whereFn(query);

    // 對特定表進行 id 排序
    if (['player_movements'].includes(tableName)) {
      query = query.order('id', { ascending: true });
    }

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




export async function GET() {
  // 1. 撈出所有資料表
  const [registerlist, start_major, movements, players] = await Promise.all([
    fetchAll('registerlist', 'Player_no'),
    fetchAll('start_major', 'Player_no'),
    fetchAll('player_movements', 'name, action'),
    fetchAll('playerslist', 'Player_no, Name', q => q.eq('Available', 'V'))
  ])

  // 2. Player_no -> cleaned name 對照表
  const playerNoToName = {}
  players.forEach(p => {
    const cleaned = cleanName(p.Name)
    playerNoToName[p.Player_no] = cleaned
  })

  // 3. 建立註冊名單（registerlist + 新註冊）
  const registeredNames = new Set()
  registerlist.forEach(row => {
    const name = playerNoToName[row.Player_no]
    if (name) registeredNames.add(name)
  })
  movements.forEach(row => {
  const name = cleanName(row.name)
  if (row.action === '新註冊' || row.action === '新入團') {
    registeredNames.add(name)
  }
})

  // 4. 建立註銷名單
  const canceledNames = new Set()
  movements.forEach(row => {
    const name = cleanName(row.name)
    if (row.action === '註冊註銷' || row.action === '除役') canceledNames.add(name)
  })

  // 5. 統計升降次數
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

  // 6.5 把所有球員清名都加入 allNames（避免沒異動紀錄就不見）
  players.forEach(p => {
    const cleaned = cleanName(p.Name)
    if (cleaned) allNames.add(cleaned)
  })

  // 7. 整合狀態
  const result = Array.from(allNames).map(name => {
    if (canceledNames.has(name)) {
      return { name, status: '註銷' }
    }

    if (!registeredNames.has(name)) {
      return { name, status: '未註冊' }
    }

    const { up = 0, down = 0 } = statusCount[name] || {}
    const status = up > down ? '一軍' : '二軍'
    return { name, status }
  })

  return NextResponse.json(result)
}
