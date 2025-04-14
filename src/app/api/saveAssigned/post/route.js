'use server'

import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// 🔧 封裝：從日期產生日期清單
function getDateList(startDateStr, endDateStr) {
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  const list = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    list.push(d.toISOString().slice(0, 10))
  }
  return list
}

export async function POST(req) {
  try {
    console.log('📥 [saveAssigned] 收到 POST 請求')

    const body = await req.json()
    const { assignedPositions, startDate, playerName, type } = body

    const user_id_cookie = req.cookies.get('user_id')
    const user_id = user_id_cookie?.value
    const manager_id = parseInt(user_id, 10)

    if (!user_id || isNaN(manager_id)) {
      return NextResponse.json({ error: '未登入或無效 user_id' }, { status: 401 })
    }

    // ✅ 若是 Add 行為 → 自動寫入 BN 資料
    if (type === 'Add' && playerName) {
      console.log(`⚾️ 偵測到 Add，為 ${playerName} 寫入 BN`)

      const dateList = getDateList(new Date().toISOString().slice(0, 10), '2025-11-30')
      const rows = dateList.map(date => ({
        date,
        manager_id,
        player_name: playerName,
        position: 'BN',
      }))

      const { error: insertError } = await supabase
        .from('assigned_position_history')
        .insert(rows)

      if (insertError) {
        console.warn('⚠️ Add 寫入 position_history 失敗:', insertError.message)
      } else {
        console.log(`📋 Add 寫入 ${rows.length} 筆 BN`)
      }

      return NextResponse.json({ message: 'Add 寫入成功', count: rows.length })
    }

    // ✅ 處理 saveAssigned 情境
    if (!assignedPositions || typeof assignedPositions !== 'object') {
      return NextResponse.json({ error: '缺少 assignedPositions' }, { status: 400 })
    }

    if (!startDate || isNaN(new Date(startDate))) {
      return NextResponse.json({ error: '缺少或無效 startDate' }, { status: 400 })
    }

    const start = new Date(startDate)
    const dateList = getDateList(startDate, '2025-11-30')

    // 抓今天的歷史 fallback
    const { data: existingData, error: fetchError } = await supabase
      .from('assigned_position_history')
      .select('player_name, position')
      .eq('manager_id', manager_id)
      .eq('date', start.toISOString().slice(0, 10))

    if (fetchError) {
      console.error('❌ 讀取歷史位置錯誤:', fetchError)
      return NextResponse.json({ error: '讀取歷史位置錯誤' }, { status: 500 })
    }

    const positionMap = {}
    existingData?.forEach(row => {
      positionMap[row.player_name] = row.position
    })

    const rows = []
    for (const date of dateList) {
      for (const player_name of Object.keys(assignedPositions)) {
        rows.push({
          date,
          manager_id,
          player_name,
          position: assignedPositions[player_name] || positionMap[player_name] || 'BN'
        })
      }
    }

    const { error } = await supabase
      .from('assigned_position_history')
      .upsert(rows, { onConflict: ['date', 'manager_id', 'player_name'] })

    if (error) {
      console.error('❌ 插入失敗:', error)
      return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
    }

    console.log(`✅ 已儲存 ${startDate} 後 ${rows.length} 筆陣容`)
    return NextResponse.json({ message: '儲存成功', count: rows.length }, { status: 200 })

  } catch (err) {
    console.error('❌ API 發生錯誤:', err)
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 })
  }
}
