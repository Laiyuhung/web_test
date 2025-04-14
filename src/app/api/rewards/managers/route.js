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

