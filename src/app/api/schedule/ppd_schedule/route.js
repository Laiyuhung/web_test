import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
  // 第一步：找出曾經延期過的 game_no
  const { data: postponedGames, error: error1 } = await supabase
    .from('cpbl_schedule')
    .select('game_no')
    .eq('is_postponed', true)

  if (error1) return res.status(500).json({ error: error1.message })

  // 過濾唯一的 game_no
  const gameNos = [...new Set(postponedGames.map(row => row.game_no))]

  if (gameNos.length === 0) return res.status(200).json([])

  // 第二步：取得所有這些 game_no 的場次
  const { data, error: error2 } = await supabase
    .from('cpbl_schedule')
    .select('*')
    .in('game_no', gameNos)

  if (error2) return res.status(500).json({ error: error2.message })

  res.status(200).json(data)
}
