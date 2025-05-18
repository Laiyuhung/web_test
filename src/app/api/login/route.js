// 原本是：import { cookies } from 'next/headers'
// 改成：
import { NextResponse } from 'next/server'
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
      return NextResponse.json({ error: '帳號或密碼錯誤', duration }, { status: 401 })
    }

    // ✅ 建立 response 並設定 cookie
    const response = NextResponse.json({ id: data.id, duration })

    response.cookies.set('user_id', String(data.id), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 年
      httpOnly: true, // 建議保留，提高安全性
    })

    return response
  } catch (err) {
    return NextResponse.json({ error: '伺服器錯誤', detail: err.message }, { status: 500 })
  }
}
