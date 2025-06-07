import supabase from '@/lib/supabase'

async function fetchAll(table, columns, whereFn = null) {
  const pageSize = 1000
  let allData = []
  let page = 0
  let done = false

  while (!done) {
    let query = supabase.from(table).select(columns)

    // ✅ 加入條件式（例如 .eq(...)）
    if (whereFn) {
      query = whereFn(query)
    }

    query = query.range(page * pageSize, (page + 1) * pageSize - 1)

    const { data, error } = await query

    if (error) throw new Error(`❌ 撈取 ${table} 失敗: ${error.message}`)

    console.log(`📄 ${table} 第 ${page + 1} 頁，拿到 ${data.length} 筆`)
    allData = allData.concat(data)

    if (data.length < pageSize) {
      done = true
    } else {
      page++
    }
  }

  console.log(`✅ ${table} 全部讀取完成，共 ${allData.length} 筆`)
  return allData
}



export async function GET() {
  try {

    const [players, transactions, managers] = await Promise.all([
      fetchAll('playerslist', 'Player_no, Name, Team, identity, B_or_P, add_date', q => q.eq('Available', 'V')),
      fetchAll('transactions', 'Player_no, manager_id, type, transaction_time'),
      fetchAll('managers', 'id, team_name')
    ])
    
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
          .filter(t => ['Drop', 'Waiver Drop'].includes(t.type))
          .sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time))[0]
        const addList = playerTx.filter(t => ['Add', 'Waiver Add', 'Draft Add'].includes(t.type))
        const lastAdd = addList
          .sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time))[0]

        const taiwanOffsetMs = 8 * 60 * 60 * 1000
        const nowTWN = new Date(Date.now() + taiwanOffsetMs)

        if (lastDrop && lastAdd) {
          const dropTime = new Date(lastDrop.transaction_time)
          const addTime = new Date(lastAdd.transaction_time)

          const dropDateStr = new Date(dropTime.getTime() + taiwanOffsetMs).toISOString().split('T')[0]
          const addDateStr = new Date(addTime.getTime() + taiwanOffsetMs).toISOString().split('T')[0]

          if (dropDateStr === addDateStr) {
            status = 'Free Agent'  // 同一天 Add + Drop，不進 Waiver
          } else {
            const dropDateTWN = new Date(dropTime.getTime() + taiwanOffsetMs)
            dropDateTWN.setHours(0, 0, 0, 0)

            const offDate = new Date(dropDateTWN)
            offDate.setDate(offDate.getDate() + 3)
            offDate.setHours(1, 0, 0, 0)

            if (nowTWN >= offDate) {
              status = 'Free Agent'
            } else {
              status = 'Waiver'
              offWaivers = new Date(offDate.getTime() - taiwanOffsetMs).toISOString()
            }
          }
        } else {
          // ⛳ 沒有 drop + add，改用 playerslist.add_date 判斷 Waiver
          const playerAddedDate = player.add_date
          if (playerAddedDate) {
            const baseDate = new Date(playerAddedDate)
            const addOffDate = new Date(baseDate)
            addOffDate.setDate(addOffDate.getDate() + 3)
            addOffDate.setHours(1, 0, 0, 0)

            const addOffUTC = new Date(addOffDate.getTime() - taiwanOffsetMs)

            if (nowTWN < addOffDate) {
              status = 'Waiver'
              offWaivers = addOffUTC.toISOString()
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
