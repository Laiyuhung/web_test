// /api/rewards/managers/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase.from('managers').select('id, team_name')
  if (error) {
    console.error('❌ managers 讀取失敗:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}


// /api/rewards/insert/route.js
import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { manager, event, awards } = await req.json()

    if (!manager || !event || awards === undefined) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const { error } = await supabase.from('rewards').insert([
      { manager, event, awards: parseInt(awards, 10) },
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