import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { text, date, isMajor } = await req.json()

    if (!text || !date || typeof isMajor !== 'boolean') {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    const extractPositions = (rawPos) => {
      // 抓出所有大寫英文字母（包含括號內的也一起抓）
      const matches = rawPos.match(/[A-Z]+/g)
      return matches || []
    }

    const parseLine = (line) => {
      const parts = line.split(/\s+/)
      let name, rawPos, stats

      if (!isNaN(parts[0])) {
        // 有棒次
        name = parts[1]
        rawPos = parts[2]
        stats = parts.slice(3)
      } else {
        // 無棒次（替補）
        name = parts[0]
        rawPos = parts[1]
        stats = parts.slice(2)
      }

      const position = extractPositions(rawPos) // 陣列格式

      const toInt = (val) => parseInt(val) || 0
      const avg = parseFloat(stats[18]) || 0

      return {
        name,
        position,
        at_bats: toInt(stats[0]),
        runs: toInt(stats[1]),
        hits: toInt(stats[2]),
        rbis: toInt(stats[3]),
        doubles: toInt(stats[4]),
        triples: toInt(stats[5]),
        home_runs: toInt(stats[6]),
        double_plays: toInt(stats[7]),
        walks: toInt(stats[9]),
        ibb: toInt(stats[10]),
        hbp: toInt(stats[11]),
        strikeouts: toInt(stats[12]),
        sacrifice_bunts: toInt(stats[13]),
        sacrifice_flies: toInt(stats[14]),
        stolen_bases: toInt(stats[15]),
        caught_stealing: toInt(stats[16]),
        errors: toInt(stats[17]),
        avg,
        game_date: date,
        is_major: isMajor,
        team: null
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
