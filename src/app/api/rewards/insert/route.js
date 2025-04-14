// /api/rewards/insert/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { team_name, event, awards } = await req.json()

    console.log('📥 收到資料:', { team_name, event, awards })

    if (!team_name || !event || awards === undefined) {
      console.warn('⚠️ 缺少必要欄位')
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    // 查找 manager_id
    const { data, error: managerError } = await supabase
      .from('managers')
      .select('id')
      .eq('team_name', team_name)
      .single()

    if (managerError) {
      console.warn('⚠️ 查找 manager_id 發生錯誤:', managerError.message)
    }

    const managerId = data?.id || 4
    console.log(`🔍 對應 manager_id：${managerId}（來自 team_name=${team_name}）`)

    // 寫入 rewards
    const { error } = await supabase.from('rewards').insert([
      {
        manager: managerId,
        event,
        awards: parseInt(awards, 10),
      },
    ])

    if (error) {
      console.error('❌ insert rewards 失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ insert 成功')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ POST 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
