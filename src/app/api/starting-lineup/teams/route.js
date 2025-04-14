import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: '缺少日期參數' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('starting_lineup')
    .select('team')
    .eq('date', date)
    .neq('team', '') // 避免空值
    .then(res => {
      // 過濾重複球隊
      const uniqueTeams = [...new Set(res.data.map(r => r.team))]
      return { data: uniqueTeams, error: res.error }
    })

  if (error) {
    console.error('❌ 查詢球隊失敗:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
