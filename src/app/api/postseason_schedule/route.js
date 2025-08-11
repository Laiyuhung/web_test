import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  // 從 fantasy_postseason_schedule 資料表取得季後賽賽程
  const { data, error } = await supabase
    .from('fantasy_postseason_schedule')
    .select('*')
    .order('start_date', { ascending: true })
    .order('match_number', { ascending: true })

  console.log('postseason_schedule data', data)
  console.log('postseason_schedule error', error)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 取得相關的 manager 資料以轉換 ID 為隊名
  if (data && data.length > 0) {
    const managerIds = new Set()
    data.forEach(match => {
      if (match.team1_id) managerIds.add(match.team1_id)
      if (match.team2_id) managerIds.add(match.team2_id)
      if (match.winner_id) managerIds.add(match.winner_id)
    })

    if (managerIds.size > 0) {
      const { data: managers, error: managerError } = await supabase
        .from('managers')
        .select('id, team_name')
        .in('id', Array.from(managerIds))

      if (!managerError && managers) {
        const managerMap = Object.fromEntries(managers.map(m => [m.id, m.team_name]))
        
        // 將 manager_id 轉換為隊名
        const enrichedData = data.map(match => ({
          ...match,
          team1_name: managerMap[match.team1_id] || match.team1_id,
          team2_name: managerMap[match.team2_id] || match.team2_id,
          winner_name: managerMap[match.winner_id] || match.winner_id
        }))

        return NextResponse.json(enrichedData)
      }
    }
  }

  return NextResponse.json(data || [])
}
