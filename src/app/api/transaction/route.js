export async function POST(req) {
  try {
    const { playerName, type, dropPlayer } = await req.json()
    const user_id = req.cookies.get('user_id')?.value
    const manager_id = parseInt(user_id, 10)

    const { data: managerData } = await supabase
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

    // Drop 處理
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

    // 查詢主球員
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single()

    if (playerError || !playerData) {
      return NextResponse.json({ error: '找不到球員' }, { status: 404 })
    }

    const Player_no = playerData.Player_no

    // 寫入交易紀錄
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
