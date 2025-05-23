import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const body = await req.json()
  const { apply_no } = body  // ✅ 改這裡

  if (!apply_no) {
    return NextResponse.json({ error: '缺少 apply_no' }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .from('waiver')
      .update({ status: 'canceled' })
      .eq('apply_no', apply_no)  // ✅ 對應欄位

    if (error) {
      console.error('❌ 取消 waiver 失敗:', error)
      return NextResponse.json({ error: '取消失敗' }, { status: 500 })
    }

    return NextResponse.json({ message: '✅ Waiver 已成功取消' })
  } catch (err) {
    console.error('❌ cancel_waiver 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
