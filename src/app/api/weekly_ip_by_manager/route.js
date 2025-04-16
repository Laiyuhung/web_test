import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

function formatIP(outs) {
  const fullInnings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${fullInnings}.${remainder}`
}

export async function POST(req) {
  try {
    const { week, manager_id } = await req.json()

    if (!week || !manager_id) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 🔹 找到週次對應的區間
    const { data: weekData } = await supabase
      .from('schedule_date')
      .select('start, end')
      .eq('week', week)
      .single()

    if (!weekData) return NextResponse.json({ error: '查無週次資料' }, { status: 404 })

    const { start, end } = weekData

    // 🔹 抓出這位 manager 當週的先發投手名單
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

    // 🔹 撈出這些投手的紀錄
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
