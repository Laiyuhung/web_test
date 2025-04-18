import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// ➤ 台灣時間轉為 UTC ISO 格式（+00:00）
function getUTCFormat() {
  const date = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + ' ' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes()) + ':' +
    pad(date.getSeconds()) + '+00:00'
  )
}

// ➤ 建立指定區間內的日期清單
function getDateList(startStr, endStr) {
  const list = []
  const startDate = new Date(`${startStr}T00:00:00`)
  const endDate = new Date(`${endStr}T00:00:00`)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    list.push(`${year}-${month}-${day}`)
  }
  return list
}

// ➤ 查詢球員編號
async function getPlayerNo(playerName) {
  const { data, error } = await supabase
    .from('playerslist')
    .select('Player_no')
    .eq('Name', playerName)
    .single()
  if (error || !data) throw new Error(`找不到球員：${playerName}`)
  return data.Player_no
}

// ➤ 核心邏輯：Drop 原隊，Add 新隊，歷史位置轉換
async function dropAndAdd(fromId, toId, playerName, dateList, transaction_time) {
  const playerNo = await getPlayerNo(playerName)

  // Drop 原隊
  await supabase.from('transactions').insert([{
    transaction_time,
    manager_id: fromId,
    type: 'Drop',
    Player_no: playerNo
  }])
  await supabase
    .from('assigned_position_history')
    .delete()
    .in('date', dateList)
    .eq('manager_id', fromId)
    .eq('player_name', playerName)

  // Add 新隊
  await supabase.from('transactions').insert([{
    transaction_time,
    manager_id: toId,
    type: 'Add',
    Player_no: playerNo
  }])
  const addRows = dateList.map(date => ({
    date,
    manager_id: toId,
    player_name: playerName,
    position: 'BN'
  }))
  await supabase.from('assigned_position_history').insert(addRows)

  // 移轉原先歷史位置資料
  const { data: oldAssigns, error } = await supabase
    .from('assigned_position_history')
    .select('*')
    .in('date', dateList)
    .eq('manager_id', fromId)
    .eq('player_name', playerName)

  if (error) {
    console.warn(`⚠️ 讀取 ${playerName} 原先歷史資料失敗`, error.message)
    return
  }

  if (oldAssigns?.length) {
    const updated = oldAssigns.map(row => ({
      ...row,
      manager_id: toId,
      position: 'BN'
    }))

    await supabase
      .from('assigned_position_history')
      .delete()
      .in('id', oldAssigns.map(r => r.id))

    await supabase
      .from('assigned_position_history')
      .insert(updated)
  }
}

export async function POST(req) {
  try {
    const { myManagerId, opponentManagerId, myPlayers, opponentPlayers } = await req.json()
    const transaction_time = getUTCFormat()
    const todayStr = new Date().toISOString().slice(0, 10)
    const endStr = '2025-11-30'
    const dateList = getDateList(todayStr, endStr)

    if (!myManagerId || !opponentManagerId || !Array.isArray(myPlayers) || !Array.isArray(opponentPlayers)) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 我的球員 → 給對方
    for (const name of myPlayers) {
      await dropAndAdd(myManagerId, opponentManagerId, name, dateList, transaction_time)
    }

    // 對方球員 → 給我
    for (const name of opponentPlayers) {
      await dropAndAdd(opponentManagerId, myManagerId, name, dateList, transaction_time)
    }

    return NextResponse.json({ message: '交換完成 ✅' })
  } catch (err) {
    console.error('❌ 錯誤:', err)
    return NextResponse.json({ error: '內部錯誤', detail: err.message }, { status: 500 })
  }
}
