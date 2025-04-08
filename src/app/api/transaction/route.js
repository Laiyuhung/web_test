import supabase from '@/lib/supabase';  // 假設你有設定supabase

export async function POST(req, res) {
  try {
    const { playerName } = await req.json();  // 從前端接收到的playerName
    console.log(`收到玩家名稱: ${playerName}`);
    
    // 確認是否有manager_id (假設它在cookie中)
    const cookie = req.cookies.get('user_id');
    if (!cookie) {
      console.log('未登入，未找到 user_id cookie');
      return res.status(401).json({ error: '未登入' });
    }

    // 查找manager_id
    const manager_id = cookie;
    console.log(`獲取到 manager_id: ${manager_id}`);

    // 查找 Player_no
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single();
    
    if (playerError || !playerData) {
      console.error('查詢玩家資料錯誤:', playerError);
      return res.status(404).json({ error: '玩家未找到' });
    }

    const Player_no = playerData.Player_no;
    console.log(`找到玩家 Player_no: ${Player_no}`);

    // 檢查是否已經有這筆交易記錄
    const { data: existingTransaction, error: checkError } = await supabase
      .from('transactions')
      .select('transaction_id')
      .eq('Player_no', Player_no)
      .eq('manager_id', manager_id)
      .eq('type', 'Add')
      .single();

    if (checkError) {
      console.error('檢查交易記錄錯誤:', checkError);
      return res.status(500).json({ error: '檢查交易記錄錯誤' });
    }

    // 如果已經有交易記錄，不允許重複插入
    if (existingTransaction) {
      console.log(`已經有玩家 ${playerName} 的 Add 交易記錄`);
      return res.status(400).json({ error: '已經存在此玩家的 Add 交易' });
    }

    // 插入新交易記錄
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([
        {
          transaction_time: new Date().toISOString(),  // 當前時間
          manager_id: manager_id,
          type: 'Add',
          Player_no: Player_no
        }
      ]);

    if (insertError) {
      console.error('插入交易記錄錯誤:', insertError);
      return res.status(500).json({ error: '插入交易記錄錯誤' });
    }

    console.log(`成功插入交易記錄，玩家: ${playerName}, transaction_time: ${new Date().toISOString()}`);
    return res.status(200).json({ message: '交易成功' });
  } catch (err) {
    console.error('❌ API 交易新增錯誤:', err);
    return res.status(500).json({ error: '內部伺服器錯誤' });
  }
}
