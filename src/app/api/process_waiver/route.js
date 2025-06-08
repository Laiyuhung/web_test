import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET() {
  console.log('🌐 手動觸發 Waiver 處理 (GET)')
  return handleWaiver()
}

export async function POST() {
  console.log('🚀 自動觸發 Waiver 處理 (POST)')
  return handleWaiver()
}

async function handleWaiver() {
  try {
    const now = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanDate = new Date(now.getTime() + taiwanOffset).toISOString().slice(0, 10)
    console.log(`📆 今日台灣日期: ${taiwanDate}`)

    const [waiverRes, priorityRes, playerRes] = await Promise.all([
      supabase.from('waiver').select('*').eq('off_waiver', taiwanDate).eq('status', 'pending'),
      supabase.from('waiver_priority').select('id, priority').order('priority', { ascending: false }),
      supabase.from('playerslist').select('Name, identity')
    ])

    if (waiverRes.error) throw new Error('讀取 Waiver 錯誤')
    if (priorityRes.error) throw new Error('讀取順位錯誤')
    if (playerRes.error) throw new Error('讀取球員列表錯誤')

    const waivers = waiverRes.data
    const priorities = priorityRes.data
    const playerList = playerRes.data

    if (!waivers || waivers.length === 0){

      console.log('📭 今日無待處理 Waiver')
      return NextResponse.json({ message: '📭 今日無待處理 Waiver' })
    } 

    const priorityList = priorities.map(p => p.id)

    for (const managerId of priorityList) {
      const managerWaivers = waivers
        .filter(w => w.manager === managerId)
        .sort((a, b) => a.personal_priority - b.personal_priority)

      if (managerWaivers.length === 0) continue

      const w = managerWaivers[0]
      console.log(`⚙️ 處理 Manager ${managerId} Waiver：新增 ${w.add_player}，移除 ${w.drop_player}`)

      const { data: positions, error: posError } = await supabase
        .from('assigned_position_history')
        .select('player_name, position')
        .eq('date', taiwanDate)
        .eq('manager_id', managerId)

      if (posError) throw new Error('讀取陣容錯誤')

      const assignedMap = Object.fromEntries(positions.map(p => [p.player_name, p.position]))
      const isForeign = (name) => {
        const p = playerList.find(p => p.Name === name)
        return p?.identity === '洋將'
      }

      if (!w.add_player) continue
      assignedMap[w.add_player] = 'BN'
      if (w.drop_player) delete assignedMap[w.drop_player]

      const assignedEntries = Object.entries(assignedMap)
      const active = ([, pos]) => !['NA', 'NA(備用)'].includes(pos)

      const foreignPlayers = assignedEntries.filter(([n]) => isForeign(n))
      const activeForeign = foreignPlayers.filter(([, pos]) => active([, pos])).length
      const totalForeign = foreignPlayers.length
      const activeTotal = assignedEntries.filter(([, pos]) => active([, pos])).length

      console.log(`🔢 模擬後：洋將 OnTeam=${totalForeign}，Active=${activeForeign}，總 Active=${activeTotal}`)

      if (activeForeign > 3 || totalForeign > 4 || activeTotal > 26) {
        await supabase.from('waiver')
          .update({ status: 'Fail (roster limit)' })
          .eq('apply_no', w.apply_no)
        console.log('❌ 限制不符，處理結束')
        return NextResponse.json({ message: '❌ 限制不符，處理結束' })
      }

      // 在設為 Success 前，檢查 drop player 是否在隊上
      if (w.drop_player) {
        const { data: dropAssigned, error: dropAssignedError } = await supabase
          .from('assigned_position_history')
          .select('player_name')
          .eq('date', taiwanDate)
          .eq('manager_id', managerId)
          .eq('player_name', w.drop_player)

        if (dropAssignedError) {
          console.warn('⚠️ 查詢 drop player 是否在隊上失敗:', dropAssignedError.message)
        }

        if (!dropAssigned || dropAssigned.length === 0) {
          // 沒有在隊上，waiver fail，結束本輪
          await supabase.from('waiver')
            .update({ status: 'Fail (drop not on team)' })
            .eq('apply_no', w.apply_no)
          console.log('❌ Drop player 不在隊上，處理結束')
          return NextResponse.json({ message: '❌ Drop player 不在隊上，處理結束' })
        }
      }

      await supabase.from('waiver')
        .update({ status: 'Success' })
        .eq('apply_no', w.apply_no)

      await supabase.from('waiver')
        .update({ status: 'Fail (low priority)' })
        .eq('off_waiver', taiwanDate)
        .eq('add_player', w.add_player)
        .neq('apply_no', w.apply_no)
        .eq('status', 'pending')

      const currentPriority = priorities.find(p => p.id === managerId)?.priority;
      if (currentPriority === undefined) {
        console.error(`❌ 找不到 Manager ${managerId} 的當前順位`);
        continue;
      }

      // ✅ 修正：將順位 > 該 manager 的玩家往前移動，該 manager 排最後（維持總數不變）
      const totalManagers = priorities.length;

      await Promise.all(
        priorities
          .filter(p => p.priority > currentPriority)
          .map(p =>
            supabase.from('waiver_priority')
              .update({ priority: p.priority - 1 })
              .eq('id', p.id)
          )
      );

      await supabase.from('waiver_priority')
        .update({ priority: totalManagers })
        .eq('id', managerId);


      // 如果通過所有檢查，將球員寫入 transactions
      const { data: addPlayerData } = await supabase
        .from('playerslist')
        .select('Player_no')
        .eq('Name', w.add_player)
        .single();

      if (addPlayerData?.Player_no) {
        await supabase.from('transactions').insert({
          transaction_time: new Date().toISOString(),
          manager_id: managerId,
          type: 'Waiver Add',
          Player_no: addPlayerData.Player_no
        });
      }

      const todayStr = taiwanDate
      const endStr = '2025-11-30'
      const dateList = []

      const startDate = new Date(`${todayStr}T00:00:00`)
      const endDate = new Date(`${endStr}T00:00:00`)
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        dateList.push(`${year}-${month}-${day}`)
      }

      const rows = dateList.map(date => ({
        date,
        manager_id: managerId,
        player_name: w.add_player,
        position: 'BN',
      }))

      const { error: assignError } = await supabase
        .from('assigned_position_history')
        .insert(rows)

      if (assignError) {
        console.warn('⚠️ Waiver Add 寫入位置失敗:', assignError.message)
      }




      if (w.drop_player) {
        const { data: dropPlayerData } = await supabase
          .from('playerslist')
          .select('Player_no')
          .eq('Name', w.drop_player)
          .single();

        if (dropPlayerData?.Player_no) {
          await supabase.from('transactions').insert({
            transaction_time: new Date().toISOString(),
            manager_id: managerId,
            type: 'Waiver Drop',
            Player_no: dropPlayerData.Player_no
          });

          // 🔻 移除 drop player 的位置記錄
          const startDate = new Date(`${taiwanDate}T00:00:00`)
          const endDate = new Date(`2025-11-30T00:00:00`)
          const dropDateList = []

          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            dropDateList.push(`${year}-${month}-${day}`)
          }

          const { error: deleteError } = await supabase
            .from('assigned_position_history')
            .delete()
            .in('date', dropDateList)
            .eq('manager_id', managerId)
            .eq('player_name', w.drop_player)

          if (deleteError) {
            console.warn('⚠️ Waiver Drop 移除位置失敗:', deleteError.message)
          }
        }
      }


      console.log('✅ 成功處理一筆，終止本輪')

      return NextResponse.json({ message: '✅ 已處理一筆 Waiver' })
    }

    return NextResponse.json({ message: '🔚 所有 Waiver 已處理完畢' })
  } catch (e) {
    console.error('❌ 處理失敗:', e)
    return NextResponse.json({ error: 'Waiver 處理失敗', detail: e.message }, { status: 500 })
  }
}
