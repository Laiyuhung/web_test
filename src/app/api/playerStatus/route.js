// ✅ /app/api/playerStatus/route.js
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data: players, error: err1 } = await supabase.from('playerslist').select('*')
    if (err1 || !Array.isArray(players)) throw new Error('playerslist error')

    const { data: transactions, error: err2 } = await supabase.from('transactions').select('*')
    if (err2 || !Array.isArray(transactions)) throw new Error('transactions error')

    const { data: managers, error: err3 } = await supabase.from('managers').select('id, team_name')
    if (err3 || !Array.isArray(managers)) throw new Error('managers error')

    const result = players.map(player => {
      const playerTx = transactions.filter(t => t.Player_no === player.Player_no)
      const addCount = playerTx.filter(t => t.type.includes('Add')).length
      const dropCount = playerTx.filter(t => t.type.includes('Drop')).length

      let status = 'Free Agent'
      let manager_id = null
      let owner = '-'

      if (addCount - dropCount === 1) {
        const lastAdd = [...playerTx].reverse().find(t => t.type.includes('Add'))
        if (lastAdd) {
          status = 'On Team'
          manager_id = lastAdd.manager_id
          owner = managers.find(m => m.id === manager_id)?.team_name || '-'
        }
      } else if (addCount - dropCount === 0) {
        const lastDrop = [...playerTx].reverse().find(t => t.type.includes('Drop'))
        if (lastDrop) {
          const dropTime = new Date(lastDrop.transaction_time)
          const now = new Date()
          const diffMs = now.getTime() - dropTime.getTime()
          const fullTwoDays = 2 * 24 * 60 * 60 * 1000
          status = diffMs >= fullTwoDays ? 'Free Agent' : 'Waiver'
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
  } catch (err) {
    console.error('❌ API playerStatus error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
