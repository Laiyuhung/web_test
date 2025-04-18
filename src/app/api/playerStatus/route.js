import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data: players, error: err1 } = await supabase
      .from('playerslist')
      .select('Player_no, Name, Team, identity, B_or_P')
      .eq('Available', 'V')  // 只選擇 Available 為 V 的球員
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
      let offWaivers = null
      let manager_id = null  // ✅ 這行要補上

      if (addCount - dropCount === 1) {
        const addList = playerTx.filter(t => t.type.includes('Add'))
				const lastAdd = addList
  				.sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time))[0]
        if (lastAdd) {
          status = 'On Team'
          const m = managers.find(m => m.id === lastAdd.manager_id)
          owner = m?.team_name || '-'
          manager_id = m?.id || null  // ✅ 這裡加上 manager_id
        }
      } else if (addCount - dropCount === 0) {
        const lastDrop = playerTx
  				.filter(t => t.type.includes('Drop'))
 					.sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time))[0]
        const addList = playerTx.filter(t => t.type.includes('Add'))
				const lastAdd = addList
  				.sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time))[0]
      
        if (lastDrop && lastAdd) {
          const dropTime = new Date(lastDrop.transaction_time)
          const addTime = new Date(lastAdd.transaction_time)
      
          // 台灣時區補正（+8 小時）
          const taiwanOffsetMs = 8 * 60 * 60 * 1000
          const dropDateStr = new Date(dropTime.getTime() + taiwanOffsetMs).toISOString().split('T')[0]
          const addDateStr = new Date(addTime.getTime() + taiwanOffsetMs).toISOString().split('T')[0]
      
          if (dropDateStr === addDateStr) {
            status = 'Free Agent'  // 同一天 Add + Drop，不進 Waiver
          } else {
            // 計算是否已滿 3 天（Drop -> Waiver）
            const nowTWN = new Date(Date.now() + taiwanOffsetMs)
            const msDiff = nowTWN.getTime() - (dropTime.getTime() + taiwanOffsetMs)
            const daysSinceDrop = Math.floor(msDiff / (1000 * 60 * 60 * 24))
      
            if (daysSinceDrop >= 2) {
              status = 'Free Agent'
            } else {
              status = 'Waiver'
              const offDate = new Date(dropTime.getTime() + taiwanOffsetMs)
              offDate.setDate(offDate.getDate() + 3)
              offWaivers = offDate.toISOString()  // 範例：2025-04-10T00:00:00.000Z
            }
          }
        }
      }
      
      

      return {
        Player_no: player.Player_no,
        Name: player.Name,
        Team: player.Team,
        identity: player.identity,
        B_or_P: player.B_or_P,
        status,
        owner,
        offWaivers,
        manager_id  // ✅ 多回傳這欄
      }
    })

    return Response.json(result)
  } catch (err) {
    console.error('❌ API playerStatus error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
