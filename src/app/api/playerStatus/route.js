import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data: players, error: err1 } = await supabase
      .from('playerslist')
      .select('Player_no, Name, Team, identity')
    if (err1 || !Array.isArray(players)) throw new Error('playerslist error')

    const { data: transactions, error: err2 } = await supabase
      .from('transactions')
      .select('Player_no, manager_id, type, transaction_time')
    if (err2 || !Array.isArray(transactions)) throw new Error('transactions error')

    const { data: managers, error: err3 } = await supabase
      .from('managers')
      .select('id, team_name')
    if (err3 || !Array.isArray(managers)) throw new Error('managers error')

    const result = players.map(player => {
      const playerTx = transactions.filter(t => t.Player_no === player.Player_no)
      const addCount = playerTx.filter(t => t.type.includes('Add')).length
      const dropCount = playerTx.filter(t => t.type.includes('Drop')).length

      let status = 'Free Agent'
      let owner = '-'

      if (addCount - dropCount === 1) {
        const lastAdd = [...playerTx].reverse().find(t => t.type.includes('Add'))
        if (lastAdd) {
          status = 'On Team'
          const m = managers.find(m => m.id === lastAdd.manager_id)
          owner = m?.team_name || '-'
        }
      } else if (addCount - dropCount === 0) {
        const lastDrop = [...playerTx].reverse().find(t => t.type.includes('Drop'))
        if (lastDrop) {
          const dropTime = new Date(lastDrop.transaction_time)
          const now = new Date()
          const diffMs = now - dropTime
          const fullTwoDays = 2 * 24 * 60 * 60 * 1000
          status = diffMs >= fullTwoDays ? 'Free Agent' : 'Waiver'
        }
      }

      return {
        Player_no: player.Player_no,
        Name: player.Name,
        Team: player.Team,
        Identity: player.identity,
        status,
        owner,
      }
    })

    return Response.json(result)
  } catch (err) {
    console.error('❌ API playerStatus error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
