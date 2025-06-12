import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  // 依照 sequence 排序
  const { data, error } = await supabase
    .from('fantasy_postseason_spot')
    .select('id, sequence, type, manager_id, spot')
    .order('sequence', { ascending: true })

  console.log('postseason_spot data', data)
  console.log('postseason_spot error', error)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
