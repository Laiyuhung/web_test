import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    console.log('📋 開始查詢季後賽賽程...')
    
    // 從 fantasy_postseason_schedule 資料表取得季後賽賽程
    const { data, error } = await supabase
      .from('fantasy_postseason_schedule')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      console.error('❌ 查詢 fantasy_postseason_schedule 失敗:', error)
      // 如果是資料表不存在的錯誤，回傳空陣列而不是錯誤
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('📋 資料表 fantasy_postseason_schedule 不存在，回傳空陣列')
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('📋 查詢到賽程數量:', data?.length || 0)

    // 如果沒有資料，直接回傳空陣列
    if (!data || data.length === 0) {
      console.log('📋 沒有賽程資料，回傳空陣列')
      return NextResponse.json([])
    }

    // 收集所有需要的 manager IDs，確保轉換為整數
    const managerIds = new Set()
    data.forEach(match => {
      if (match.team1) managerIds.add(parseInt(match.team1))
      if (match.team2) managerIds.add(parseInt(match.team2))
    })

    // 過濾掉無效的 ID
    const validManagerIds = Array.from(managerIds).filter(id => !isNaN(id))

    if (validManagerIds.length === 0) {
      return NextResponse.json(data)
    }

    // 取得 managers 資料
    const { data: managers, error: managerError } = await supabase
      .from('managers')
      .select('id, team_name')
      .in('id', validManagerIds)

    if (managerError) {
      console.error('Error fetching managers:', managerError)
      return NextResponse.json({ error: managerError.message }, { status: 500 })
    }

    // 建立 manager ID 到 team name 的對應表
    const managerMap = Object.fromEntries(
      (managers || []).map(m => [m.id, m.team_name])
    )

    // 轉換資料，加入 team names
    const enrichedData = data.map(match => ({
      ...match,
      team1_name: managerMap[match.team1] || null,
      team2_name: managerMap[match.team2] || null
    }))

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error('❌ Postseason schedule API 意外錯誤:', error)
    console.error('錯誤詳情:', error.message)
    console.error('錯誤堆疊:', error.stack)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
