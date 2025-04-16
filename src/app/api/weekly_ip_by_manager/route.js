import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

export async function POST(req) {
  try {
    const { manager_id } = await req.json()

    if (!manager_id) {
      return NextResponse.json({ error: '缺少 manager_id' }, { status: 400 })
    }

    // 取得今天（台灣時間）
    const now = new Date()
    const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const todayStr = taiwanNow.toISOString().slice(0, 10)

    // 查詢 schedule_date 表，找出今天所在週
    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('schedule_date')
      .select('start, end')

    if (scheduleError) throw scheduleError

    const currentWeek = scheduleRows.find(row => {
      return todayStr >= row.start && todayStr <= row.end
    })

    if (!currentWeek) {
      return NextResponse.json({ IP: '0.0', message: '找不到本週區間' })
    }

    const { start, end } = currentWeek

    // 撈出這個 manager 當週的先發名單
    const { data: assigned } = await supabase
      .from('assigned_position_history')
      .select('player_name, position, date')
      .eq('manager_id', manager_id)
      .gte('date', start)
      .lte('date', end)

    const starters = assigned.filter(row => !['BN', 'NA', 'NA(備用)'].includes(row.position))

    const playerDatesMap = {}
    for (const row of starters) {
      if (!playerDatesMap[row.player_name]) playerDatesMap[row.player_name] = new Set()
      playerDatesMap[row.player_name].add(row.date)
    }

    const playerNames = Object.keys(playerDatesMap)

    if (playerNames.length === 0) {
      return NextResponse.json({ IP: '0.0' })
    }

    const { data: pitchingStats } = await supabase
      .from('pitching_stats')
      .select('name, game_date, innings_pitched')
      .in('name', playerNames)
      .gte('game_date', start)
      .lte('game_date', end)

    let totalOuts = 0

    for (const row of pitchingStats) {
      const dates = playerDatesMap[row.name]
      if (dates?.has(row.game_date)) {
        const ip = row.innings_pitched || 0
        const outs = Math.floor(ip) * 3 + Math.round((ip % 1) * 10)
        totalOuts += outs
      }
    }

    return NextResponse.json({ IP: formatIP(totalOuts) })

  } catch (err) {
    console.error('❌ weekly_ip_by_manager 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
