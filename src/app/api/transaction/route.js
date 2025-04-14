import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// 🔧 台灣 +08:00 時區的 ISO 格式
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

// 🔧 回傳 [今天 ~ 2025-11-30] 所有日期字串
function getDateList(startStr, endStr) {
  const list = []
  const start = new Date(startStr)
  const end = new Date(endStr)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    list.push(d.toISOString().slice(0, 10))
  }
  return list
}

export async function POST(req) {
  try {
    const { playerName, type } = await req.json()
    const user_id = req.cookies.get('user_id')?.value
    const manager_id = parseInt(user_id, 10)

    if (!playerName || !user_id || isNaN(manager_id)) {
      return NextResponse.json({ error: '參數錯誤或未登入' }, { status: 400 })
    }

    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single()

    if (playerError || !playerData) {
      return NextResponse.json({ error: '找不到球員' }, { status: 404 })
    }

    const Player_no = playerData.Player_no
    const transaction_time = getUTCFormat()

    // ✅ 寫入交易
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([{ transaction_time, manager_id, type, Player_no }])

    if (insertError) {
      return NextResponse.json({ error: '交易寫入失敗' }, { status: 500 })
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const endStr = '2025-11-30'

    if (type === 'Add') {
      const dateList = getDateList(todayStr, endStr)
      const rows = dateList.map(date => ({
        date,
        manager_id,
        player_name: playerName,
        position: 'BN',
      }))

      const { error: assignError } = await supabase
        .from('assigned_position_history')
        .insert(rows)

      if (assignError) {
        console.warn('⚠️ Add 時寫入位置失敗:', assignError.message)
      }
    }

    if (type === 'Drop') {
      const dateList = getDateList(todayStr, endStr)

      const { error: deleteError } = await supabase
        .from('assigned_position_history')
        .delete()
        .in('date', dateList)
        .eq('manager_id', manager_id)
        .eq('player_name', playerName)

      if (deleteError) {
        console.warn('⚠️ Drop 時刪除位置失敗:', deleteError.message)
      }
    }

    return NextResponse.json({
      message: '交易成功',
      transaction: {
        transaction_time,
        manager_id,
        type,
        Player_no
      }
    })
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 })
  }
}
