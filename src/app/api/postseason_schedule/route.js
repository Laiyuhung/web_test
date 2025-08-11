import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    // 從 fantasy_postseason_schedule 資料表取得季後賽賽程
    const { data, error } = await supabase
      .from('fantasy_postseason_schedule')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 如果沒有資料，直接回傳空陣列
    if (!data || data.length === 0) {
      return NextResponse.json([])
    }

    // 收集所有需要的 manager IDs，確保轉換為整數
    const managerIds = new Set()
    data.forEach(match => {
      if (match.team1_id) managerIds.add(parseInt(match.team1_id))
      if (match.team2_id) managerIds.add(parseInt(match.team2_id))
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
      team1_name: managerMap[match.team1_id] || null,
      team2_name: managerMap[match.team2_id] || null
    }))

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
