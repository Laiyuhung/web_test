import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const { manager_id } = await req.json()

  const { data, error } = await supabase
    .from('waiver_priority')
    .select('priority')
    .eq('id', manager_id)
    .single()

  if (error) {
    console.error('❌ 查詢失敗:', error)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  return NextResponse.json({ priority: data?.priority || null })
}
