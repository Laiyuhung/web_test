// /app/api/playerStatus/route.js
import supabase from '@/lib/supabase'

export async function GET() {
  const { data: players, error: err1 } = await supabase
    .from('playersList')
    .select('Player_no, Name')

  if (err1) return Response.json({ error: err1.message }, { status: 500 })

  const { data: txns, error: err2 } = await supabase
    .from('transactions')
    .select('player_no, manager_id, type, transaction_time')

  if (err2) return Response.json({ error: err2.message }, { status: 500 })

  const now = new Date()

  const result = players.map(player => {
    const records = txns
      .filter(t => t.player_no === player.Player_no)
      .sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time))

    const addCount = records.filter(t => t.type.includes('Add')).length
    const dropCount = records.filter(t => t.type.includes('Drop')).length
    const net = addCount - dropCount

    let status = 'Free Agent'
    let owner = ''

    if (net === 1) {
      // 找最近一次 Add 的人
      const recentAdd = records.find(t => t.type.includes('Add'))
      status = 'On Team'
      owner = recentAdd?.manager_id ?? ''
    } else {
      const lastDrop = records.find(t => t.type.includes('Drop'))
      if (lastDrop) {
        const dropTime = new Date(lastDrop.transaction_time)
        const diff = (now - dropTime) / (1000 * 60 * 60 * 24) // 天數
        status = diff >= 2 ? 'Free Agent' : 'Waiver'
      }
    }

    return {
      Player_no: player.Player_no,
      Name: player.Name,
      status,
      owner
    }
  })

  return Response.json(result)
}
