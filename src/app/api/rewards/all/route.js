// /api/rewards/all/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 查詢獎金細節
    const { data: details, error: detailError } = await supabase
      .from('rewards')
      .select('manager_id, event, awards, created_at, managers ( team_name )')
      .order('created_at', { ascending: false })

    if (detailError) {
      console.error('❌ 查詢 rewards 細節失敗:', detailError)
      return NextResponse.json({ error: detailError.message }, { status: 500 })
    }

    // 查詢累計獎金總額
    const { data: summary, error: summaryError } = await supabase
      .from('rewards')
      .select('manager_id, managers ( team_name )')
      .select('manager_id, managers ( team_name ), sum(awards) as total')
      .group('manager_id, managers.team_name')

    if (summaryError) {
      console.error('❌ 查詢累計失敗:', summaryError)
      return NextResponse.json({ error: summaryError.message }, { status: 500 })
    }

    return NextResponse.json({ details, summary })
  } catch (err) {
    console.error('❌ GET 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
