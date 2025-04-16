import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function POST() {
  try {
    const now = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanDate = new Date(now.getTime() + taiwanOffset).toISOString().slice(0, 10)
    console.log(`📆 今日台灣日期: ${taiwanDate}`)

    // 1️⃣ 撈出今日所有 pending 的 waiver
    const { data: waivers, error: waiverError } = await supabase
      .from('waiver')
      .select('*')
      .eq('off_waiver', taiwanDate)
      .eq('status', 'pending')

    if (waiverError) throw new Error('讀取 Waiver 錯誤')
    if (!waivers || waivers.length === 0) return NextResponse.json({ message: '📭 今日無待處理 Waiver' })

    console.log(`📌 今日共 ${waivers.length} 筆待處理 Waiver`)

    // 2️⃣ 撈出順位順序
    const { data: priorities, error: priorityError } = await supabase
      .from('waiver_priority')
      .select('id, priority')
      .order('priority', { ascending: false })

    if (priorityError) throw new Error('讀取 Waiver 順位錯誤')

    let priorityList = priorities.map(p => p.id)
    console.log('📋 當前順位順序:', priorityList)

    // 3️⃣ 依序處理各順位
    for (let i = 0; i < priorityList.length; i++) {
      const managerId = priorityList[i]
      const managerWaivers = waivers
        .filter(w => w.manager === managerId)
        .sort((a, b) => a.personal_priority - b.personal_priority)

      if (managerWaivers.length === 0) {
        console.log(`⏭️ Manager ${managerId} 無待處理項目`)
        continue
      }

      const w = managerWaivers[0]
      console.log(`⚙️ 處理 Manager ${managerId} Waiver：新增 ${w.add_player}，移除 ${w.drop_player}`)

      // 撈當日 assigned_position_history
      const { data: positions, error: posError } = await supabase
        .from('assigned_position_history')
        .select('player_name, position')
        .eq('date', taiwanDate)
        .eq('manager_id', managerId)

      if (posError) throw new Error('讀取陣容錯誤')

      const assignedMap = Object.fromEntries(positions.map(p => [p.player_name, p.position]))

      // 撈球員是否洋將
      const { data: playerList } = await supabase
        .from('playerslist')
        .select('Name, identity')

      const isForeign = (name) => {
        const p = playerList.find(p => p.Name === name)
        return p?.identity === '洋將'
      }

      // 模擬加入
      if (!w.add_player) continue
      assignedMap[w.add_player] = 'BN'
      if (w.drop_player) delete assignedMap[w.drop_player]

      const assignedEntries = Object.entries(assignedMap)
      const foreignPlayers = assignedEntries.filter(([n]) => isForeign(n))
      const active = ([, pos]) => !['NA', 'NA(備用)'].includes(pos)

      const activeForeign = foreignPlayers.filter(([, pos]) => active([, pos])).length
      const totalForeign = foreignPlayers.length
      const activeTotal = assignedEntries.filter(([_, pos]) => active([_, pos])).length

      console.log(`🔢 模擬後：洋將 OnTeam=${totalForeign}，Active=${activeForeign}，總 Active=${activeTotal}`)

      if (activeForeign > 3 || totalForeign > 4 || activeTotal > 26) {
        console.log('❌ 違反 Roster 限制，標記為 Fail (roster limit)')
        await supabase.from('waiver')
          .update({ status: 'Fail (roster limit)' })
          .eq('apply_no', w.apply_no)
        continue
      }

      // 成功，標記為 Success
      console.log('✅ 通過 Roster 檢查，標記為 Success')
      await supabase.from('waiver')
        .update({ status: 'Success' })
        .eq('apply_no', w.apply_no)

      // 同日同球員其他申請 Fail
      const { error: updateOthersError } = await supabase
        .from('waiver')
        .update({ status: 'Fail (low priority)' })
        .eq('off_waiver', taiwanDate)
        .eq('add_player', w.add_player)
        .neq('apply_no', w.apply_no)
        .eq('status', 'pending')

      if (updateOthersError) console.error('❌ 無法更新其他 Waiver:', updateOthersError)

      // 順位移到最後
      const newPriority = Math.min(...priorities.map(p => p.priority)) - 1
      console.log(`🔃 調整順位：Manager ${managerId} 新順位 ${newPriority}`)
      await supabase.from('waiver_priority')
        .update({ priority: newPriority })
        .eq('id', managerId)

      // 更新本地 priorityList，放最後
      priorityList.splice(i, 1)
      priorityList.push(managerId)
      i-- // 下一輪仍從目前 index 處理
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ 處理失敗:', e)
    return NextResponse.json({ error: 'Waiver 處理失敗' }, { status: 500 })
  }
}
