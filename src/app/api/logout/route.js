import { cookies } from 'next/headers'

export async function POST() {
  cookies().delete('user_id') // ❌ 清除登入用的 cookie
  return Response.json({ message: '登出成功' })
}
