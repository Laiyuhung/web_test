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

      await supabase.from('waiver')
        .update({ status: 'Success' })
        .eq('apply_no', w.apply_no)

      await supabase.from('waiver')
        .update({ status: 'Fail (low priority)' })
        .eq('off_waiver', taiwanDate)
        .eq('add_player', w.add_player)
        .neq('apply_no', w.apply_no)
        .eq('status', 'pending')

      const newPriority = Math.min(...priorities.map(p => p.priority)) - 1
      await supabase.from('waiver_priority')
        .update({ priority: newPriority })
        .eq('id', managerId)

      console.log('✅ 成功處理一筆，終止本輪')

      return NextResponse.json({ message: '✅ 已處理一筆 Waiver' })
    }

    return NextResponse.json({ message: '🔚 所有 Waiver 已處理完畢' })
  } catch (e) {
    console.error('❌ 處理失敗:', e)
    return NextResponse.json({ error: 'Waiver 處理失敗', detail: e.message }, { status: 500 })
  }
}
