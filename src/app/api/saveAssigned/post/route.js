'use server'

import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    console.log('📥 [saveAssigned] 收到 POST 請求')

    const { assignedPositions, startDate } = await req.json()
    if (!assignedPositions || typeof assignedPositions !== 'object') {
      return NextResponse.json({ error: '缺少 assignedPositions' }, { status: 400 })
    }

    if (!startDate || isNaN(new Date(startDate))) {
      return NextResponse.json({ error: '缺少或無效 startDate' }, { status: 400 })
    }
    

    const user_id_cookie = req.cookies.get('user_id')
    const user_id = user_id_cookie?.value
    const manager_id = parseInt(user_id, 10)

    if (!user_id || isNaN(manager_id)) {
      return NextResponse.json({ error: '未登入或無效 user_id' }, { status: 401 })
    }

    // ✅ 台灣當地時間（UTC+8）
    const start = new Date(startDate)
    const endDate = new Date('2025-11-30')

    // ✅ 日期列表
    const dateList = []
    for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().slice(0, 10))
    }

    // ✅ 抓歷史紀錄（只抓今天的，做 fallback 用）
    const { data: existingData, error: fetchError } = await supabase
      .from('assigned_position_history')
      .select('player_name, position')
      .eq('manager_id', manager_id)
      .eq('date', start.toISOString().slice(0, 10)) // 只抓今天的

    if (fetchError) {
      console.error('❌ 讀取歷史位置錯誤:', fetchError)
      return NextResponse.json({ error: '讀取歷史位置錯誤' }, { status: 500 })
    }

    const positionMap = {}
    existingData?.forEach(row => {
      positionMap[row.player_name] = row.position
    })

    // ✅ 展開成多筆資料（每個 player × 每天）
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

    console.log(`✅ 已儲存 ${start} 後陣容`)
    return NextResponse.json({ message: '儲存成功', count: rows.length }, { status: 200 })

  } catch (err) {
    console.error('❌ API 發生錯誤:', err)
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 })
  }
}
