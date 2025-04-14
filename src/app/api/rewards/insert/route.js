// /api/rewards/insert/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { manager, event, awards } = await req.json()

    if (!manager || !event || awards === undefined) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    // 🔍 查出 managers 表中對應的 id
    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .select('id')
      .eq('team_name', manager)
      .single()

    if (managerError || !managerData) {
      return NextResponse.json({ error: `找不到隊伍名稱 ${manager}` }, { status: 400 })
    }

    const managerId = managerData.id

    // ✅ 插入 rewards 表格
    const { error } = await supabase.from('rewards').insert([
      { manager: managerId, event, awards: parseInt(awards, 10) },
    ])

    if (error) {
      console.error('❌ insert rewards 失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ POST 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
