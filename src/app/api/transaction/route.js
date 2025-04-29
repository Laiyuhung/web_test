import { NextResponse } from 'next/server'
import { sendTradeNotificationEmail } from '@/lib/email'
import supabase from '@/lib/supabase'

// 🔧 台灣 +08:00 時區的 ISO 格式
function getUTCFormat() {
  const date = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + ' ' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes()) + ':' +
    pad(date.getSeconds()) + '+00:00'
  )
}

function getDateList(startStr, endStr) {
  const list = []

  const startDate = new Date(`${startStr}T00:00:00`)
  const endDate = new Date(`${endStr}T00:00:00`)

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    list.push(`${year}-${month}-${day}`)
  }

  return list
}

function getTaiwanTodayStr() {
  const now = new Date()
  now.setHours(now.getHours() + 8)  // 加 8 小時變成台灣時間
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


export async function POST(req) {
  try {
    const { playerName, type, dropPlayer } = await req.json()
    const user_id = req.cookies.get('user_id')?.value
    const manager_id = parseInt(user_id, 10)

    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .select('team_name')
      .eq('id', manager_id)
      .single()

    const managerName = managerData?.team_name || `玩家 #${manager_id}`

    if (!playerName || !user_id || isNaN(manager_id)) {
      return NextResponse.json({ error: '參數錯誤或未登入' }, { status: 400 })
    }

    const todayStr = getTaiwanTodayStr()
    const endStr = '2025-11-30'
    const transaction_time = getUTCFormat()

    // 📌 若有 dropPlayer，先處理 Drop
    if (dropPlayer) {
      const { data: dropPlayerData, error: dropPlayerError } = await supabase
        .from('playerslist')
        .select('Player_no')
        .eq('Name', dropPlayer)
        .single()

      if (dropPlayerError || !dropPlayerData) {
        return NextResponse.json({ error: '找不到 Drop 的球員' }, { status: 404 })
      }

      const dropPlayerNo = dropPlayerData.Player_no
      const dropDateList = getDateList(todayStr, endStr)

      await supabase.from('transactions').insert([{
        transaction_time,
        manager_id,
        type: 'Drop',
        Player_no: dropPlayerNo
      }])

      await supabase
        .from('assigned_position_history')
        .delete()
        .in('date', dropDateList)
        .eq('manager_id', manager_id)
        .eq('player_name', dropPlayer)
    }

    // 📌 查詢要 Add/Drop 的主球員
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single()

    if (playerError || !playerData) {
      return NextResponse.json({ error: '找不到球員' }, { status: 404 })
    }

    const Player_no = playerData.Player_no

    // ✅ 寫入本次交易
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([{ transaction_time, manager_id, type, Player_no }])

    if (insertError) {
      return NextResponse.json({ error: '交易寫入失敗' }, { status: 500 })
    }

    const dateList = getDateList(todayStr, endStr)

    if (type === 'Add') {
      const rows = dateList.map(date => ({
        date,
        manager_id,
        player_name: playerName,
        position: 'BN',
      }))

      const { error: assignError } = await supabase
        .from('assigned_position_history')
        .insert(rows)

      if (assignError) {
        console.warn('⚠️ Add 時寫入位置失敗:', assignError.message)
      }
    }

    if (type === 'Drop') {
      const { error: deleteError } = await supabase
        .from('assigned_position_history')
        .delete()
        .in('date', dateList)
        .eq('manager_id', manager_id)
        .eq('player_name', playerName)

      if (deleteError) {
        console.warn('⚠️ Drop 時刪除位置失敗:', deleteError.message)
      }
    }

    // // 📨 新增：交易成功後發信（發給固定四個人）
    // const recipients = [
    //   "mar.hung.0708@gmail.com",
    //   "laiyuhung921118@gmail.com",
    //   "peter0984541203@gmail.com",
    //   "anthonylin6507@gmail.com"
    // ]

    // // 📨 如果有 dropPlayer，先發 Drop 通知
    // if (dropPlayer) {
    //   await Promise.all(
    //     recipients.map(email =>
    //       sendTradeNotificationEmail(
    //         email,
    //         `CPBL Fantasy transaction 通知`,
    //         `
    //         <h2>Drop 通知</h2>
    //         <p><strong>${managerName}</strong> 已成功Drop 球員：</p>
    //         <ul>
    //           <li><strong>球員：</strong> ${dropPlayer}</li>
    //         </ul>
    //         <p>時間：${transaction_time}</p>
    //         `
    //       )
    //     )
    //   )
    // }

    // // 📨 再發 Add 通知
    // await Promise.all(
    //   recipients.map(email =>
    //     sendTradeNotificationEmail(
    //       email,
    //       `CPBL Fantasy transaction 通知`,
    //       `
    //       <h2>Add 通知</h2>
    //       <p><strong>${managerName}</strong> 已成功Add 球員：</p>
    //       <ul>
    //         <li><strong>球員：</strong> ${playerName}</li>
    //       </ul>
    //       <p>時間：${transaction_time}</p>
    //       `
    //     )
    //   )
    // )

    


    return NextResponse.json({
      message: '交易成功',
      transaction: {
        transaction_time,
        manager_id,
        type,
        Player_no
      }
    })
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 })
  }
}
