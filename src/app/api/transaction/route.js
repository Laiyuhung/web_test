import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(req) {
  try {
    console.log('📥 收到 POST 請求，開始處理...');

    const { playerName } = await req.json();
    console.log('🎯 收到的 playerName:', playerName);

    const user_id_cookie = req.cookies.get('user_id');
    const user_id = user_id_cookie?.value;
    console.log('🍪 從 cookies 中獲得的 user_id:', user_id);

    if (!user_id) {
      console.log('⚠️ 未登入，user_id 不存在');
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const manager_id = parseInt(user_id, 10);
    console.log('🔢 轉換後的 manager_id:', manager_id, typeof manager_id);

    if (isNaN(manager_id)) {
      console.log('❌ 無效的 manager_id:', user_id);
      return NextResponse.json({ error: '無效的 manager_id' }, { status: 400 });
    }

    const { data: playerData, error: playerError } = await supabase
      .from('playerslist')
      .select('Player_no')
      .eq('Name', playerName)
      .single();

    if (playerError || !playerData) {
      console.log('❗ 玩家未找到:', playerError);
      return NextResponse.json({ error: '玩家未找到' }, { status: 404 });
    }

    const Player_no = playerData.Player_no;
    const transaction_time = new Date().toISOString();
    const type = 'Add';

    // 🧾 印出即將插入的資料
    console.log('🧾 準備插入的交易資料如下：');
    console.log({
      transaction_time,
      manager_id,
      type,
      Player_no
    });

    // ✅ 寫入資料庫
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([{
        transaction_time,
        manager_id,
        type,
        Player_no
      }]);

    if (insertError) {
      console.log('❌ 插入交易記錄錯誤:', insertError);
      return NextResponse.json({ error: '插入交易記錄錯誤' }, { status: 500 });
    }

    // ✅ 成功回應
    console.log('🎉 交易成功，已插入新的交易記錄');
    return NextResponse.json({
      message: '交易成功',
      transaction: {
        transaction_time,
        manager_id,
        type,
        Player_no
      }
    });

  } catch (err) {
    console.error('❌ API 錯誤:', err);
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}
