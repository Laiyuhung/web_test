// ✅ /app/api/bulk-insert/route.js
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
      rawPos = rawPos.replace(/（/g, '(').replace(/）/g, ')')
      const matches = rawPos.match(/[A-Z]+\d*|\d+[A-Z]+/g)
      return matches || []
    }

    const parseLine = (line) => {
      line = line.replace(/（0）/g, '0')
      line = line.replace(/（/g, '(').replace(/）/g, ')')

      const parts = line.split(/\s+/)
      let name = '', rawPos = '', stats = []

      if (!isNaN(parts[0])) {
        // 有棒次
        name = parts[1]
        rawPos = parts[2]
        stats = parts.slice(3)
      } else {
        // 替補
        name = parts[0]
        rawPos = parts[1]
        stats = parts.slice(2)
      }

      const position = extractPositions(rawPos)
      const toInt = (val) => parseInt(val) || 0
      const toFloat = (val) => parseFloat(val) || 0

      if (stats.length !== 19) {
        console.warn('⚠️ 欄位數錯誤：', name, stats.length, stats)
        return null // 跳過這筆
      }

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
        avg: toFloat(stats[18]),
        game_date: date,
        is_major: isMajor
      }
    }

    const records = lines.map(parseLine).filter(Boolean)

    const { error } = await supabase.from('batting_stats').insert(records)

    if (error) {
      console.error('❌ Supabase insert 錯誤:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: records.length })
  } catch (err) {
    console.error('❌ API 例外錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
