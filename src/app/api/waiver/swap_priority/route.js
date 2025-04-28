import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST(req) {
  const body = await req.json()
  const { id1, id2 } = body

  if (!id1 || !id2) {
    return NextResponse.json({ error: '缺少 id1 或 id2' }, { status: 400 })
  }

  try {
    // 抓兩筆資料
    const { data: w1, error: e1 } = await supabase
      .from('waiver')
      .select('apply_no, personal_priority')
      .eq('apply_no', id1)
      .single()

    const { data: w2, error: e2 } = await supabase
      .from('waiver')
      .select('apply_no, personal_priority')
      .eq('apply_no', id2)
      .single()

    if (e1 || e2 || !w1 || !w2) {
      console.error('查詢失敗:', e1, e2)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    // 交換 priority
    const updates = [
      supabase.from('waiver').update({ personal_priority: w2.personal_priority }).eq('id', id1),
      supabase.from('waiver').update({ personal_priority: w1.personal_priority }).eq('id', id2)
    ]

    const [res1, res2] = await Promise.all(updates)

    if (res1.error || res2.error) {
      console.error('更新失敗:', res1.error, res2.error)
      return NextResponse.json({ error: '更新失敗' }, { status: 500 })
    }

    return NextResponse.json({ message: '交換成功' })

  } catch (err) {
    console.error('後端錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
