// /api/rewards/all/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 取得 manager_id 1~4 的獎金總和 + team_name
    const { data: summaryRaw, error: summaryError } = await supabase
      .from('rewards')
      .select('manager, awards')
    
    const { data: managers, error: mgrErr } = await supabase
      .from('managers')
      .select('id, team_name')
    
    if (summaryError || mgrErr) {
      console.error('❌ 讀取錯誤:', summaryError || mgrErr)
      return NextResponse.json({ error: '資料查詢失敗' }, { status: 500 })
    }

    const managerMap = Object.fromEntries(managers.map(m => [m.id, m.team_name]))

    const summary = [1, 2, 3, 4].map(id => {
      const total = summaryRaw
        .filter(r => r.manager === id)
        .reduce((sum, r) => sum + (r.awards || 0), 0)
      return { id, team_name: managerMap[id] || `隊伍 ${id}`, total }
    })

    // 所有紀錄明細
    const { data: list, error: listError } = await supabase
      .from('rewards')
      .select('manager, event, awards, created_at')
      .order('created_at', { ascending: false })

    const listWithName = list.map(r => ({
      ...r,
      team_name: managerMap[r.manager] || `隊伍 ${r.manager}`
    }))

    return NextResponse.json({ summary, list: listWithName })
  } catch (err) {
    console.error('❌ 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
