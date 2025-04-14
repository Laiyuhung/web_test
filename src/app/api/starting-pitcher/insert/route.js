import supabase from '@/lib/supabase'

export async function insertStartingPitcher(date, name) {
  const { error } = await supabase.from('starting_pitcher').insert([
    {
      date: date,
      name: name,
    },
  ])

  if (error) {
    console.error('❌ 寫入失敗:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}
