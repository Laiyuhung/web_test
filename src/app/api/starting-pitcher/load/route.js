import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: '缺少日期' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('starting_pitcher')
    .select('*')
    .eq('date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
