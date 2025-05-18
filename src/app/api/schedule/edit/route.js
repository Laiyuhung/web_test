// /api/schedule.js (POST)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const payload = req.body

  if (payload.uuid) {
    // 更新
    const { error } = await supabase
      .from('cpbl_schedule')
      .update({
        date: payload.date,
        game_no: payload.game_no,
        time: payload.time,
        away: payload.away,
        home: payload.home,
        stadium: payload.stadium,
        is_postponed: payload.is_postponed ?? false,
      })
      .eq('uuid', payload.uuid)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ message: 'Updated successfully' })
  } else {
    // 新增
    const { error } = await supabase
      .from('cpbl_schedule')
      .insert([{
        date: payload.date,
        game_no: payload.game_no,
        time: payload.time,
        away: payload.away,
        home: payload.home,
        stadium: payload.stadium,
        is_postponed: payload.is_postponed ?? false,
      }])

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ message: 'Inserted successfully' })
  }
}
