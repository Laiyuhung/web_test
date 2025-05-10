import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const body = await req.json()
    const { id, account, password, team_name } = body

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }

    const updates = {}
    if (account !== undefined) updates.account = account
    if (password !== undefined) updates.password = password
    if (team_name !== undefined) updates.team_name = team_name

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有提供任何要更新的欄位' }, { status: 400 })
    }

    const { error } = await supabase
      .from('managers')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: '✅ 更新成功' })
  } catch (err) {
    console.error('❌ 更新失敗:', err)
    return NextResponse.json({ error: err.message || '更新失敗' }, { status: 500 })
  }
}
