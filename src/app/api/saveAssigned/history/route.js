import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const manager_id = searchParams.get('manager_id')

    // 印出接收到的參數
    console.log("接收到的參數:", { date, manager_id });

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

    // 印出從資料庫取得的資料
    console.log("從資料庫取得的資料:", data);

    // 回傳資料之前，印出回傳的資料
    console.log("回傳資料:", data);
    
    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ API 發生例外錯誤:', err)
    return NextResponse.json({ error: '內部錯誤' }, { status: 500 })
  }
}
