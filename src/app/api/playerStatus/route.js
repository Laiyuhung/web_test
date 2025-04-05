// 1. 撈出所有 managers
const { data: managers } = await supabase.from('managers').select('id, name')

// 2. 撈出所有 transactions
const { data: transactions } = await supabase
  .from('transactions')
  .select('Player_no, type, manager_id, transaction_time')

// 3. 撈出 playersList
const { data: players } = await supabase.from('playersList').select('Player_no, Name')

// 4. 推論每位球員狀態
const statusList = players.map(player => {
  const ptx = transactions.filter(t => t.Player_no === player.Player_no)

  const addCount = ptx.filter(t => t.type.includes('Add')).length
  const dropCount = ptx.filter(t => t.type.includes('Drop')).length

  let status = ''
  let ownerName = '-'

  if (addCount - dropCount === 1) {
    status = 'On Team'
    const latestAdd = ptx.filter(t => t.type.includes('Add')).sort((a, b) =>
      new Date(b.transaction_time) - new Date(a.transaction_time)
    )[0]
    ownerName = managers.find(m => m.id === latestAdd.manager_id)?.name || '-'
  } else {
    const latestDrop = ptx.filter(t => t.type.includes('Drop')).sort((a, b) =>
      new Date(b.transaction_time) - new Date(a.transaction_time)
    )[0]
    if (latestDrop) {
      const dropTime = new Date(latestDrop.transaction_time)
      const now = new Date()
      const diff = now - dropTime
      const twoDays = 1000 * 60 * 60 * 24 * 2
      status = diff >= twoDays ? 'Free Agent' : 'Waiver'
    } else {
      status = 'Free Agent'
    }
  }

  return {
    Player_no: player.Player_no,
    Name: player.Name,
    status,
    owner: ownerName,
  }
})
