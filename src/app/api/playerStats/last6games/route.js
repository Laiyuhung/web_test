import supabase from '@/lib/supabase'

export async function POST(req) {
  const { name, type, team } = await req.json()

  if (!name || !type || !team) {
    return Response.json({ error: '缺少必要參數' }, { status: 400 })
  }

  const isPitcher = type === 'pitcher'
  const table = isPitcher ? 'pitching_stats' : 'batting_stats'

  if (isPitcher) {
    const { data: stats, error } = await supabase
      .from(table)
      .select('*')
      .eq('name', name)
      .eq('is_major', true)
      .gt('game_date', '2025-03-01')
      .lte('game_date', today) // ✅ 加上這一行：排除未來比賽
      .order('game_date', { ascending: false })
      .limit(20)

    if (error) return Response.json({ error: '讀取投手資料失敗' }, { status: 500 })

    const filtered = stats.filter(d => parseFloat(d.OUT || 0) >= 0).slice(0, 6)

    const processed = filtered.map(d => {
      const OUT = parseFloat(d.OUT || 0)
      const IP = Math.floor(OUT / 3) + (OUT % 3) / 10
      const H = parseFloat(d.hits_allowed || 0)
      const ER = parseFloat(d.earned_runs || 0)
      const BB = parseFloat(d.walks || 0)

      const ERA = IP ? (ER * 9) / IP : 0
      const WHIP = IP ? (BB + H) / IP : 0

      return {
        game_date: d.game_date,
        opponent: d.opponent || '', // 可自行補上對手欄位
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
        ERA: ERA.toFixed(2),
        WHIP: WHIP.toFixed(2)
      }
    })

    return Response.json({ recentGames: processed })
  } else {
    const { data: games, error: scheduleError } = await supabase
      .from('cpbl_schedule')
      .select('date, home, away')
      .or(`home.eq.${team},away.eq.${team}`)
      .lte('date', today)
      .order('date', { ascending: false })
      .limit(6)

    if (scheduleError) return Response.json({ error: '讀取賽程失敗' }, { status: 500 })

    const results = []

    for (const g of games.reverse()) {
      const date = g.date
      const opponent = g.home === team ? g.away : g.home

      const { data: stats } = await supabase
        .from(table)
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
      const SLG = AB ? TB / AB : 0
      const AVG = AB ? H / AB : 0
      const OPS = OBP + SLG

      results.push({
        game_date: date,
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
        AVG: parseFloat(AVG.toFixed(3)),
        OPS: parseFloat(OPS.toFixed(3))
      })
    }

    return Response.json({ recentGames: results })
  }
}
