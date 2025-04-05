import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase.from('users').select('*')

    if (error) {
      console.error('❌ Supabase SELECT error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data })
  } catch (err) {
    console.error('❌ GET 例外錯誤:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
