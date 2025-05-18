// /app/api/schedule/edit/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const payload = await req.json()

  if (payload.uuid) {
    // 更新
    const { error } = await supabase
      .from('cpbl_schedule')
      .update({
        date: payload.date,
        game_no: payload.game_no,
        time: payload.time,
        away: payload.away,
        home: payload.home,
        stadium: payload.stadium,
        is_postponed: payload.is_postponed ?? false,
      })
      .eq('uuid', payload.uuid)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Updated successfully' })
  } else {
    // 新增
    const { error } = await supabase
      .from('cpbl_schedule')
      .insert([{
        date: payload.date,
        game_no: payload.game_no,
        time: payload.time,
        away: payload.away,
        home: payload.home,
        stadium: payload.stadium,
        is_postponed: payload.is_postponed ?? false,
      }])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Inserted successfully' }, { status: 201 })
  }
}
