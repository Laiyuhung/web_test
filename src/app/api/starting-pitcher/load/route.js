import supabase from '@/lib/supabase'

export async function getStartingPitchersByDate(date) {
  const { data, error } = await supabase
    .from('starting_pitcher')
    .select('*')
    .eq('date', date)

  if (error) {
    console.error('❌ 讀取失敗:', error.message)
    return []
  }

  return data // 陣列，包含每位先發投手資料
}
