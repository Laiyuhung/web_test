import { cookies } from 'next/headers'
import supabase from '@/lib/supabase'

export async function POST(request) {
  const start = Date.now()

  try {
    const { account, password } = await request.json()

    const { data, error } = await supabase
      .from('managers')
      .select('id')
      .eq('account', account)
      .eq('password', password)
      .single()

    const duration = Date.now() - start

    if (error || !data) {
      return Response.json({ error: '帳號或密碼錯誤', duration }, { status: 401 })
    }

    // ✅ 設定 cookie（7 天）
    cookies().set('user_id', data.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return Response.json({ id: data.id, duration })
  } catch (err) {
    return Response.json({ error: '伺服器錯誤', detail: err.message }, { status: 500 })
  }
}
