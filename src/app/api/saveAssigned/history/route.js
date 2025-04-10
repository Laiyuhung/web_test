import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const manager_id = searchParams.get('manager_id')

    if (!date || !manager_id) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assigned_position_history')
      .select('player_name, position')
      .eq('date', date)
      .eq('manager_id', manager_id)

    if (error) {
      console.error('❌ Supabase 錯誤:', error)
      return NextResponse.json({ error: '資料庫錯誤' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ API 發生例外錯誤:', err)
    return NextResponse.json({ error: '內部錯誤' }, { status: 500 })
  }
}
