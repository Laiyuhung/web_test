import supabase from '@/lib/supabase';  // 假設您有設定supabase

export async function POST(req, res) {
  try {
    console.log('收到POST請求，開始處理...');
    
    // 從前端接收到的playerName
    const { playerName } = await req.json();
    console.log('收到的 playerName:', playerName);

    // 確認是否有manager_id (假設它在cookie中)
    const user_id = req.cookies.get('user_id');
    console.log('從cookies中獲得的user_id:', user_id);

    if (!user_id) {
      console.log('未登入，未找到 user_id cookie');
      return res.status(401).json({ error: '未登入' });
    }

    // 查找manager_id，並確保是整數型態
    let manager_id = parseInt(user_id, 10);
    console.log('確認的manager_id:', manager_id);

    if (isNaN(manager_id)) {
      console.log('無效的 manager_id:', user_id);
      return res.status(400).json({ error: '無效的 manager_id' });
    }

    // 查找 Player_no
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single();

    if (playerError || !playerData) {
      console.log('玩家未找到:', playerError);
      return res.status(404).json({ error: '玩家未找到' });
    }

    const Player_no = playerData.Player_no;
    console.log('找到的 Player_no:', Player_no);

    // 插入新交易記錄
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([{
        transaction_time: new Date().toISOString(),  // 當前時間
        manager_id: manager_id,
        type: 'Add',
        Player_no: Player_no
      }]);

    if (insertError) {
      console.log('插入交易記錄錯誤:', insertError);
      return res.status(500).json({ error: '插入交易記錄錯誤' });
    }

    console.log('交易成功，已插入新的交易記錄');
    return res.status(200).json({ message: '交易成功' });
  } catch (err) {
    console.error('❌ API 交易新增錯誤:', err);
    return res.status(500).json({ error: '內部伺服器錯誤' });
  }
}
