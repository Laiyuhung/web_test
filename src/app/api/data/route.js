// src/app/api/login/route.js
import supabase from '@/lib/supabase'

export async function POST(request) {
  const start = Date.now()
  try {
    const { account, password } = await request.json()
    if (!account || !password) {
      return Response.json({ error: '請輸入帳號與密碼' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('account', account)
      .eq('password', password)
      .single()

    const duration = Date.now() - start

    if (error || !data) {
      return Response.json({ error: '登入失敗，帳號或密碼錯誤', duration }, { status: 401 })
    }

    return Response.json({ id: data.id, duration })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
