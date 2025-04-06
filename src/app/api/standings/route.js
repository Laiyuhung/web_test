import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { type } = await req.json()

    if (!['firstHalf', 'secondHalf', 'season'].includes(type)) {
      return NextResponse.json({ error: 'type 無效' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('standings')
      .select(`
        *,
        managers ( team_name )
      `)

    if (error) {
      console.error('❌ 讀取 standings 錯誤:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 排序用欄位，例如 firstHalf_points
    const pointKey = `${type}_points`

    // 對應每筆資料
    const result = data.map(row => ({
      id: row.id,
      team_name: row.managers?.team_name || '(未知隊伍)',
      [`${type}_1st`]: row[`${type}_1st`],
      [`${type}_2nd`]: row[`${type}_2nd`],
      [`${type}_3rd`]: row[`${type}_3rd`],
      [`${type}_4th`]: row[`${type}_4th`],
      [`${type}_points`]: row[`${type}_points`],
    }))

    // 依照 type_points 做排序（高分在前）
    result.sort((a, b) => (b[pointKey] ?? 0) - (a[pointKey] ?? 0))

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ API 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
