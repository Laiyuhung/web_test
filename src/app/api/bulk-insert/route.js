import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { text, date, isMajor } = await req.json()

    if (!text || !date || typeof isMajor !== 'boolean') {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    const parseLine = (line) => {
      const parts = line.split(/\s+/)

      return {
        name: parts[1],
        position: parts[2],
        at_bats: parseInt(parts[3]),
        runs: parseInt(parts[4]),
        hits: parseInt(parts[5]),
        rbis: parseInt(parts[6]),
        doubles: parseInt(parts[7]),
        triples: parseInt(parts[8]),
        home_runs: parseInt(parts[9]),
        double_plays: parseInt(parts[10]),
        walks: parseInt(parts[12]),
        ibb: parseInt(parts[13]),
        hbp: parseInt(parts[14]),
        strikeouts: parseInt(parts[15]),
        sacrifice_bunts: parseInt(parts[16]),
        sacrifice_flies: parseInt(parts[17]),
        stolen_bases: parseInt(parts[18]),
        caught_stealing: parseInt(parts[19]),
        errors: 0, // 若沒有資料則填 0 或 null
        avg: parseFloat(parts[20]),
        game_date: date,
        is_major: isMajor,
        team: null // 若你有傳入球隊名稱可寫進來
      }
    }

    const records = lines.map(parseLine)

    const { error } = await supabase.from('batting_stats').insert(records)

    if (error) {
      console.error('❌ Supabase insert 錯誤:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ API 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
