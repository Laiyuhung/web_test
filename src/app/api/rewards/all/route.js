// /api/rewards/all/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 查詢獎金資料（使用 manager_id）
    const { data: summaryRaw, error: summaryError } = await supabase
      .from('rewards')
      .select('manager_id, awards')

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
        .filter(r => r.manager_id === id)
        .reduce((sum, r) => sum + (r.awards || 0), 0)
      return { id, team_name: managerMap[id] || `隊伍 ${id}`, total }
    })

    // 所有明細（記得是 manager_id）
    const { data: list, error: listError } = await supabase
      .from('rewards')
      .select('manager_id, event, awards, created_at')
      .order('created_at', { ascending: false })

    const listWithName = list.map(r => ({
      ...r,
      team_name: managerMap[r.manager_id] || `隊伍 ${r.manager_id}`
    }))

    return NextResponse.json({ summary, list: listWithName })
  } catch (err) {
    console.error('❌ 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
