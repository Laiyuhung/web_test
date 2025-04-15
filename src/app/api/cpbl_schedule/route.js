import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  const { team, date } = await req.json()

  if (!team || !date) {
    return NextResponse.json({ error: '缺少 team 或 date' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cpbl_schedule')
    .select('*')
    .eq('date', date)
    .or(`home.eq.${team},away.eq.${team}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
