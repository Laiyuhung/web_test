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

    // 📅 今天（台灣時間）
    const now = new Date()
    const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const todayStr = taiwanNow.toISOString().slice(0, 10)
    console.log('📅 今天（台灣）:', todayStr)

    // 🟢 查 regular season schedule
    const { data: regularRows, error: regularError } = await supabase
      .from('schedule_date')
      .select('start, end')

    if (regularError) throw regularError
    console.log('📚 regular 賽程週數:', regularRows.length)

    let currentWeek = regularRows.find(row => todayStr >= row.start && todayStr <= row.end)

    // 🔁 若 regular 沒有，再查 postseason schedule
    if (!currentWeek) {
      console.log('⚠️ 找不到 regular 賽程週，改查季後賽')
      const { data: postRows, error: postError } = await supabase
        .from('fantasy_postseason_schedule')
        .select('start_date, end_date')

      if (postError) throw postError
      console.log('📚 postseason 賽程週數:', postRows.length)

      currentWeek = postRows.find(row => todayStr >= row.start && todayStr <= row.end)
    }

    if (!currentWeek) {
      console.log('❌ 找不到任何週期（regular + postseason）')
      return NextResponse.json({ IP: '0.0', message: '找不到本週或季後賽區間' })
    }

    const { start, end } = currentWeek
    console.log(`✅ 週期範圍：${start} ~ ${end}`)

    // 撈出這個 manager 當週的先發名單
    const { data: assigned } = await supabase
      .from('assigned_position_history')
      .select('player_name, position, date')
      .eq('manager_id', manager_id)
      .gte('date', start)
      .lte('date', end)

    console.log('📌 assigned 總筆數:', assigned?.length ?? 0)

    const starters = assigned.filter(row => !['BN', 'NA', 'NA(備用)'].includes(row.position))
    console.log('✅ 符合先發條件人數:', starters.length)

    const playerDatesMap = {}
    for (const row of starters) {
      if (!playerDatesMap[row.player_name]) playerDatesMap[row.player_name] = new Set()
      playerDatesMap[row.player_name].add(row.date)
    }

    const playerNames = Object.keys(playerDatesMap)
    console.log('👤 有上場紀錄的投手名單:', playerNames)

    if (playerNames.length === 0) {
      return NextResponse.json({ IP: '0.0' })
    }

    const { data: pitchingStats } = await supabase
      .from('pitching_stats')
      .select('name, game_date, innings_pitched')
      .in('name', playerNames)
      .gte('game_date', start)
      .lte('game_date', end)
      .eq('is_major', true)

    console.log('📊 撈到的投手場次數量:', pitchingStats?.length ?? 0)

    let totalOuts = 0

    for (const row of pitchingStats) {
      const dates = playerDatesMap[row.name]
      if (dates?.has(row.game_date)) {
        const ip = row.innings_pitched || 0
        const outs = Math.floor(ip) * 3 + Math.round((ip % 1) * 10)
        console.log(`🧾 ${row.name} @ ${row.game_date}：IP = ${ip}, 換算出局數 = ${outs}`)
        totalOuts += outs
      }
    }

    const finalIP = formatIP(totalOuts)
    console.log('🧮 最後計算出 IP:', finalIP)

    return NextResponse.json({ IP: finalIP })

  } catch (err) {
    console.error('❌ weekly_ip_by_manager 錯誤:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}