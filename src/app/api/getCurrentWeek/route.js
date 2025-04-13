import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('schedule_date')
    .select('*')
    .lte('start', today)
    .gte('end', today)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '無符合週次' }, { status: 404 })
  }

  return NextResponse.json({
    week: data.week,
    start: data.start,
    end: data.end
  })
}
