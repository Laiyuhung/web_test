import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const { manager_id } = await req.json()
    if (!manager_id) {
      return NextResponse.json({ error: '缺少 manager_id' }, { status: 400 })
    }

    // 取得今天（台灣時間）
    const now = new Date()
    const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const todayStr = taiwanNow.toISOString().slice(0, 10) // '2025-04-17'

    // 查詢 add_schedule_date，找出包含今天的週次
    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('add_schedule_date')
      .select('start, end')
    
    if (scheduleError) throw scheduleError

    const currentWeek = scheduleRows.find(row => {
      return todayStr >= row.start && todayStr <= row.end
    })

    if (!currentWeek) {
      return NextResponse.json({ count: 0, message: '找不到本週區間' })
    }

    const startUtc = new Date(`${currentWeek.start}T00:00:00+08:00`).toISOString()
    const endUtc = new Date(`${currentWeek.end}T23:59:59+08:00`).toISOString()

    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', manager_id)
      .ilike('type', 'Add')  // 不區分大小寫的模糊比對
		  .not.ilike('type', '%Trade Add%') 
      .gte('transaction_time', startUtc)
      .lte('transaction_time', endUtc)

    
    console.log('📊 查詢結果 count:', count)

    if (countError) throw countError

    return NextResponse.json({ count })
  } catch (err) {
    console.error('❌ 查詢 Add 數量錯誤:', err)
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
