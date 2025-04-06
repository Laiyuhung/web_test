import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { text, date, isMajor } = await req.json()

    if (!text || !date || typeof isMajor !== 'boolean') {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    const parseInnings = (str) => {
      if (str.includes('/')) {
        const [whole, fraction] = str.split('/').map(Number)
        const base = Math.floor(whole)
        if (fraction === 1) return base + 0.1
        if (fraction === 2) return base + 0.2
        return base
      }
      return parseFloat(str) || 0
    }

    const extractNameAndNote = (raw) => {
      const match = raw.match(/^(.+?)\s*(?:\(([^)]+)\))?$/)
      const note = match?.[2]?.split(',')[0].trim() || null
      return {
        name: match?.[1].trim() || '',
        note
      }
    }

    const parseLine = (line) => {
      const parts = line.split(/\s+/)
      const sequence = parseInt(parts[0]) || 0

      const inningIndex = parts.findIndex(p =>
        /^(\d+\/3|\d+(\.\d)?)$/.test(p)
      )
      if (inningIndex === -1) throw new Error('❌ 找不到投球局數欄位')

      const namePart = parts.slice(1, inningIndex).join(' ')
      const { name, note } = extractNameAndNote(namePart)

      let stats = parts.slice(inningIndex).map(p => p.replace(/[（）]/g, ''))

      // 🛡️ 防錯位處理：保證 stats 有 17 欄
      if (stats.length > 17) stats = stats.slice(0, 17)
      while (stats.length < 17) stats.push('0')

      const toInt = val => parseInt(val) || 0
      const toFloat = val => parseFloat(val) || 0

      return {
        sequence,
        name,
        record: note,
        innings_pitched: parseInnings(stats[0]),
        batters_faced: toInt(stats[1]),
        pitches_thrown: toInt(stats[2]),
        strikes_thrown: toInt(stats[3]),
        hits_allowed: toInt(stats[4]),
        home_runs_allowed: toInt(stats[5]),
        walks: toInt(stats[6]),
        ibb: toInt(stats[7]),
        hbp: toInt(stats[8]),
        strikeouts: toInt(stats[9]),
        wild_pitches: toInt(stats[10]),
        balks: toInt(stats[11]),
        runs_allowed: toInt(stats[12]),
        earned_runs: toInt(stats[13]),
        errors: toInt(stats[14]),
        era: toFloat(stats[15]),
        whip: toFloat(stats[16]),
        game_date: date,
        is_major: isMajor
      }
    }

    const records = lines.map(parseLine)

    const { error } = await supabase.from('pitching_stats').insert(records)

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
