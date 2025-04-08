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
        const lastAdd = [...playerTx].reverse().find(t => t.type.includes('Add'))
        if (lastAdd) {
          status = 'On Team'
          const m = managers.find(m => m.id === lastAdd.manager_id)
          owner = m?.team_name || '-'
          manager_id = m?.id || null  // ✅ 這裡加上 manager_id
        }
      } else if (addCount - dropCount === 0) {
        const lastDrop = [...playerTx].reverse().find(t => t.type.includes('Drop'))
        if (lastDrop) {
          const dropTimeUTC = new Date(lastDrop.transaction_time)
          const taiwanOffsetMs = 8 * 60 * 60 * 1000
          const dropTimeTWN = new Date(dropTimeUTC.getTime() + taiwanOffsetMs)
          const nowTWN = new Date(Date.now() + taiwanOffsetMs)
      
          // 取得台灣當地的 yyyy-mm-dd 字串
          const toDateStr = (d) => d.toISOString().split('T')[0]
          const dropDateStr = toDateStr(dropTimeTWN)
          const todayDateStr = toDateStr(nowTWN)
      
          if (dropDateStr === todayDateStr) {
            status = 'Free Agent'  // 同一天不進 Waiver
          } else {
            const msDiff = nowTWN.getTime() - dropTimeTWN.getTime()
            const daysSinceDrop = Math.floor(msDiff / (1000 * 60 * 60 * 24))
            if (daysSinceDrop >= 3) {
              status = 'Free Agent'
            } else {
              status = 'Waiver'
              const offDate = new Date(dropTimeTWN)
              offDate.setDate(offDate.getDate() + 3)
              const month = offDate.getMonth() + 1
              const day = offDate.getDate()
              offWaivers = offDate.toISOString()  // 例如：2025-04-10T00:00:00.000Z
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
