import supabase from '@/lib/supabase'

export async function POST(req) {
  const { name, type, team } = await req.json()

  if (!name || !type || !team) {
    return Response.json({ error: '缺少必要參數' }, { status: 400 })
  }

  const isPitcher = type === 'pitcher'
  const table = isPitcher ? 'pitching_stats' : 'batting_stats'

  if (isPitcher) {
    // 👉 投手：找出他實際出場過的前 6 場成績
    const { data: stats, error } = await supabase
      .from(table)
      .select('*')
      .eq('name', name)
      .gt('game_date', '2025-03-01') // 確保是本季
      .order('game_date', { ascending: false })
      .limit(20)

    if (error) return Response.json({ error: '讀取投手資料失敗' }, { status: 500 })

    const filtered = stats.filter(d => parseFloat(d.IP) > 0 || parseFloat(d.OUT) > 0).slice(0, 6)

    return Response.json({ recentGames: filtered })
  } else {
    // 👉 打者：查找球隊最近 6 場比賽
    const { data: games, error: scheduleError } = await supabase
      .from('cpbl_schedule')
      .select('date, home, away')
      .or(`home.eq.${team},away.eq.${team}`)
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
        .maybeSingle()

      results.push({
        date,
        opponent,
        ...stats,
      })
    }

    return Response.json({ recentGames: results })
  }
}
