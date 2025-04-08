import supabase from '@/lib/supabase';

export async function POST(req, res) {
  try {
    console.log('📥 收到 POST 請求，開始處理...');

    // 從前端接收到的 playerName
    const { playerName } = await req.json();
    console.log('🎯 收到的 playerName:', playerName);

    // 從 cookie 拿 user_id
    const user_id = req.cookies.get('user_id');
    console.log('🍪 從 cookies 中獲得的 user_id:', user_id);

    if (!user_id) {
      console.log('⚠️ 未登入，user_id 不存在');
      return res.status(401).json({ error: '未登入' });
    }

    const manager_id = parseInt(user_id, 10);
    console.log('🔢 轉換後的 manager_id:', manager_id, typeof manager_id);

    if (isNaN(manager_id)) {
      console.log('❌ 無效的 manager_id:', user_id);
      return res.status(400).json({ error: '無效的 manager_id' });
    }

    // 查找 Player_no
    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single();

    if (playerError || !playerData) {
      console.log('❗ 玩家未找到:', playerError);
      return res.status(404).json({ error: '玩家未找到' });
    }

    const Player_no = playerData.Player_no;
    const transaction_time = new Date().toISOString();
    const type = 'Add';

    // ✅ 印出即將插入的資料內容
    console.log('🧾 準備插入的交易資料如下：');
    console.log({
      transaction_time,
      manager_id,
      type,
      Player_no
    });

    // 不插入資料，只回傳 log 結果
    return res.status(200).json({
      message: '✅ 測試成功，以下為交易資料內容',
      transaction: {
        transaction_time,
        manager_id,
        type,
        Player_no
      }
    });

  } catch (err) {
    console.error('❌ API 錯誤:', err);
    return res.status(500).json({ error: '內部伺服器錯誤' });
  }
}
