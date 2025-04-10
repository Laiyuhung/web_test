// app/api/saveAssigned/load/route.js
'use server'

import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  try {
    console.log('📤 [loadAssigned] 收到 GET 請求')

    const user_id_cookie = req.cookies.get('user_id')
    const user_id = user_id_cookie?.value
    const manager_id = parseInt(user_id, 10)

    if (!user_id || isNaN(manager_id)) {
      return NextResponse.json({ error: '未登入或無效 user_id' }, { status: 401 })
    }

    const now = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanDate = new Date(now.getTime() + taiwanOffset)
    const date = taiwanDate.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('assigned_position_history')
      .select('player_name, position')
      .eq('manager_id', manager_id)
      .eq('date', date)

    if (error) {
      console.error('❌ 無法讀取紀錄:', error)
      return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
