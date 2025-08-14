import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    // 從 fantasy_postseason_series 資料表取得季後賽系列賽資料
    const { data, error } = await supabase
      .from('fantasy_postseason_series')
      .select('*')
      .order('stage_no', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 如果沒有資料，直接回傳空陣列
    if (!data || data.length === 0) {
      return NextResponse.json([])
    }

    // 收集所有需要的 manager IDs，確保轉換為整數
    const managerIds = new Set()
    data.forEach(series => {
      if (series.lower_seed_team) managerIds.add(parseInt(series.lower_seed_team))
      if (series.higher_seed_team) managerIds.add(parseInt(series.higher_seed_team))
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
    const enrichedData = data.map(series => ({
      ...series,
      lower_seed_team_name: managerMap[series.lower_seed_team] || null,
      higher_seed_team_name: managerMap[series.higher_seed_team] || null
    }))

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
