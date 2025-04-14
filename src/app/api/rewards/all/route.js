// /api/rewards/all/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 撈出 managers 表（用來對應 team_name）
    const { data: managers, error: mgrErr } = await supabase
      .from('managers')
      .select('id, team_name')

    if (mgrErr) {
      console.error('❌ managers 查詢失敗:', mgrErr)
      return NextResponse.json({ error: '無法讀取 managers 資料' }, { status: 500 })
    }

    // 撈出 rewards 表中所有資料
    const { data: rewards, error: rewardsErr } = await supabase
      .from('rewards')
      .select('manager_id, event, awards, created_at')
      .order('created_at', { ascending: false })

    if (rewardsErr) {
      console.error('❌ rewards 查詢失敗:', rewardsErr)
      return NextResponse.json({ error: '無法讀取 rewards 資料' }, { status: 500 })
    }

    const managerMap = Object.fromEntries(managers.map(m => [m.id, m.team_name]))

    // ✅ 重算累計總額（只有出現過 manager_id 的才會顯示）
    const summaryMap = {}
    for (const r of rewards) {
      if (!summaryMap[r.manager_id]) {
        summaryMap[r.manager_id] = 0
      }
      summaryMap[r.manager_id] += r.awards || 0
    }

    const summary = Object.entries(summaryMap).map(([id, total]) => ({
      id: parseInt(id, 10),
      team_name: managerMap[id] || `隊伍 ${id}`,
      total
    }))

    // 明細加上 team_name
    const list = rewards.map(r => ({
      ...r,
      team_name: managerMap[r.manager_id] || `隊伍 ${r.manager_id}`,
    }))

    return NextResponse.json({ summary, list })
  } catch (err) {
    console.error('❌ 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
