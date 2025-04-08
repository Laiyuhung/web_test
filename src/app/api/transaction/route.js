import supabase from '@/lib/supabase'  // 假設你有設定supabase

export async function POST(req, res) {
  try {
    const { playerName } = await req.json()  // 從前端接收到的playerName
    console.log('收到的playerName:', playerName)

    // 確認是否有manager_id (假設它在cookie中)
    const cookie = req.cookies.get('user_id')
    if (!cookie) return res.status(401).json({ error: '未登入' })
    console.log('從cookies中獲得的user_id:', cookie)

    let manager_id = cookie;

    // 確保manager_id為整數型態
    manager_id = parseInt(manager_id, 10);  // 將manager_id轉換為整數型態
    console.log('確認的manager_id:', manager_id)

    if (isNaN(manager_id)) return res.status(400).json({ error: '無效的manager_id' });

    // 查找 Player_no
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single()

    // 印出 player 查詢的結果和錯誤
    console.log('playerData:', playerData)
    console.log('playerError:', playerError)

    if (playerError || !playerData) return res.status(404).json({ error: '玩家未找到' })

    const Player_no = playerData.Player_no;

    // 插入新交易記錄
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([{
        transaction_time: new Date().toISOString(),  // 當前時間
        manager_id: manager_id,  // 使用整數型態的manager_id
        type: 'Add',
        Player_no: Player_no
      }])

    // 印出插入錯誤
    console.log('insertError:', insertError)

    if (insertError) return res.status(500).json({ error: '插入交易記錄錯誤' })

    return res.status(200).json({ message: '交易成功' })
  } catch (err) {
    console.error('❌ API 交易新增錯誤:', err)
    return res.status(500).json({ error: '內部伺服器錯誤' })
  }
}
