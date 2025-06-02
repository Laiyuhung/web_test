import supabase from '@/lib/supabase'

export async function POST(req) {
  const { name, type, team } = await req.json()
  if (!name || !type || !team) {
    return Response.json({ error: '缺少必要參數' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const isPitcher = type === 'pitcher'

  if (isPitcher) {
    const { data: stats, error } = await supabase
      .from('pitching_stats')
      .select('*')
      .eq('name', name)
      .eq('is_major', true)
      .lte('game_date', today)
      .order('game_date', { ascending: false })
      .limit(6)

    if (error) return Response.json({ error: '讀取投手資料失敗' }, { status: 500 })

    // 撈對手資料
    const gameDates = stats.map(d => d.game_date)
    const { data: schedules } = await supabase
      .from('cpbl_schedule')
      .select('date, home, away')
      .in('date', gameDates)

    const opponentMap = {}
    for (const g of schedules || []) {
      if (g.home === team) {
        opponentMap[g.date] = g.away
        console.log(`📅 ${g.date} | Home: ${g.home}, Away: ${g.away}`)
        console.log(`🏠 我方: ${team} (Home) → 對手: ${g.away}`)
      } else if (g.away === team) {
        opponentMap[g.date] = g.home
        console.log(`📅 ${g.date} | Home: ${g.home}, Away: ${g.away}`)
        console.log(`🏠 我方: ${team} (Away) → 對手: ${g.home}`)
      }
      // ❌ 如果這場不是我們的比賽，就不要寫入 opponentMap
    }



    const processed = stats.map(d => {
      const rawIP = d.innings_pitched || 0
      const outs = Math.floor(rawIP) * 3 + Math.round((rawIP % 1) * 10)
      const OUT = parseFloat(outs || 0)
      const IP = Math.floor(OUT / 3) + (OUT % 3) / 10
      const H = parseFloat(d.hits_allowed || 0)
      const ER = parseFloat(d.earned_runs || 0)
      const BB = parseFloat(d.walks || 0)
      let ERA = '0.00'
      if (IP === 0) {
        ERA = ER > 0 ? 'INF' : '0.00'
      } else {
        ERA = ((ER * 9) / IP).toFixed(2)
      }

      let WHIP = '0.00'
      if (IP === 0) {
        WHIP = (BB + H) > 0 ? 'INF' : '0.00'
      } else {
        WHIP = ((BB + H) / IP).toFixed(2)
      }

      return {
        game_date: d.game_date.slice(5), // 只取 MM-DD
        opponent: opponentMap[d.game_date] || '',
        IP: IP.toFixed(1),
        W: d.record === 'W' ? 1 : 0,
        L: d.record === 'L' ? 1 : 0,
        HLD: d.record === 'H' ? 1 : 0,
        SV: d.record === 'S' ? 1 : 0,
        H,
        ER,
        K: d.strikeouts || 0,
        BB,
        QS: IP >= 6 && ER <= 3 ? 1 : 0,
        OUT,
        ERA: ERA,
        WHIP: WHIP
      }
    })

    return Response.json({ recentGames: processed })
  }

  else {
    const { data: games, error: scheduleError } = await supabase
      .from('cpbl_schedule')
      .select('date, home, away')
      .or(`home.eq.${team},away.eq.${team}`)
      .lte('date', today)
      .eq('is_postponed', false)
      .order('date', { ascending: false })
      .limit(6)

    if (scheduleError) return Response.json({ error: '讀取賽程失敗' }, { status: 500 })

    const results = []

    for (const g of games.reverse()) {
      const date = g.date
      const opponent = g.home === team ? g.away : g.home

      const { data: stats } = await supabase
        .from('batting_stats')
        .select('*')
        .eq('name', name)
        .eq('game_date', date)
        .eq('is_major', true)
        .maybeSingle()

      const safe = stats ?? {
        at_bats: 0, runs: 0, hits: 0, home_runs: 0, rbis: 0, stolen_bases: 0,
        strikeouts: 0, walks: 0, double_plays: 0,
        doubles: 0, triples: 0, hit_by_pitch: 0, sacrifice_flies: 0,
      }

      const AB = parseFloat(safe.at_bats || 0)
      const H = parseFloat(safe.hits || 0)
      const HR = parseFloat(safe.home_runs || 0)
      const BB = parseFloat(safe.walks || 0)
      const G2B = parseFloat(safe.doubles || 0)
      const G3B = parseFloat(safe.triples || 0)
      const HBP = parseFloat(safe.hit_by_pitch || 0)
      const SF = parseFloat(safe.sacrifice_flies || 0)

      const single = H - G2B - G3B - HR
      const XBH = G2B + G3B + HR
      const TB = single + 2 * G2B + 3 * G3B + 4 * HR
      const OBP_den = AB + BB + HBP + SF
      const OBP = OBP_den ? (H + BB + HBP) / OBP_den : 0
      const SLG = AB ? (TB / AB) : 0
      const AVG = AB ? (H / AB) : 0
      const OPS = OBP + SLG

      const formattedAVG = `.${(AVG.toFixed(3) + '').split('.')[1] || '000'}`
      const formattedOPS = `.${(OPS.toFixed(3) + '').split('.')[1] || '000'}`


      results.push({
        game_date: date.slice(5), // 只取 MM-DD
        opponent,
        AB,
        R: safe.runs || 0,
        H,
        HR,
        RBI: safe.rbis || 0,
        SB: safe.stolen_bases || 0,
        K: safe.strikeouts || 0,
        BB,
        GIDP: safe.double_plays || 0,
        XBH,
        TB,
        AVG: formattedAVG,
        OPS: formattedOPS
      })
    }

    return Response.json({ recentGames: results })
  }
}
