// /app/api/schedule/daily/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cpbl_schedule')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
