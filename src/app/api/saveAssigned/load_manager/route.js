// app/api/saveAssigned/load/route.js
'use server'

import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(req) {
  try {
    console.log('📤 [loadAssigned] 收到 GET 請求')

    const url = new URL(req.url)

    // ✅ 優先讀取 query string 傳入的 manager_id
    const managerIdParam = url.searchParams.get('manager_id')
    const manager_id = managerIdParam 
      ? parseInt(managerIdParam, 10)
      : parseInt(cookies().get('user_id')?.value || '', 10)

    if (!manager_id || isNaN(manager_id)) {
      return NextResponse.json({ error: '未登入或無效 manager_id' }, { status: 401 })
    }

    const queryDate = url.searchParams.get('date')  // e.g. '2025-04-13'

    const now = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanDate = new Date(now.getTime() + taiwanOffset)
    const defaultDate = taiwanDate.toISOString().slice(0, 10)

    const date = queryDate || defaultDate

    const { data, error } = await supabase
      .from('assigned_position_history')
      .select('player_name, position')
      .eq('manager_id', manager_id)
      .eq('date', date)

    if (error) {
      console.error('❌ 無法讀取紀錄:', error)
      return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
    }

    console.log(`📦 ${date} 的 assigned players（manager_id=${manager_id}）:`)
    data?.forEach(p => {
      console.log(`🔹 ${p.player_name} -> ${p.position}`)
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
