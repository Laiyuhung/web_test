import supabase from '@/lib/supabase'

export async function GET() {
  console.log('✅ 檢查環境變數：', process.env.SUPABASE_URL)

  try {
    const { data, error } = await supabase.from('users').select('*')

    if (error) {
      console.error('❌ SELECT 錯誤:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data })
  } catch (err) {
    console.error('❌ API 例外錯誤:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
