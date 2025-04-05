import supabase from '@/lib/supabase'

export async function POST(request) {
  const start = Date.now()

  try {
    const { account, password } = await request.json()

    if (!account || !password) {
      return Response.json({ error: '缺少帳號或密碼' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('managers')
      .select('id')
      .eq('account', account)
      .eq('password', password)
      .single()

    const end = Date.now()
    const duration = end - start

    if (error || !data) {
      return Response.json({ error: '帳號或密碼錯誤', duration }, { status: 401 })
    }

    return Response.json({ id: data.id, duration })
  } catch (err) {
    return Response.json({ error: '伺服器錯誤', detail: err.message }, { status: 500 })
  }
}
