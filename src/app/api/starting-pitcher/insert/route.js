import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { date, name } = await req.json()

    if (!date || !name) {
      return NextResponse.json({ error: '缺少日期或名稱' }, { status: 400 })
    }

    const { error } = await supabase.from('starting_pitcher').insert([
      { date, name }
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
