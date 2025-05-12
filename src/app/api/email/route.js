// app/api/email/send/route.js
import { sendTradeNotificationEmail } from '@/lib/email'

export async function POST(req) {
  const { to, subject, html } = await req.json()

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  try {
    const result = await sendTradeNotificationEmail(to, subject, html)
    return Response.json({ success: true, info: result })
  } catch (err) {
    console.error('❌ Email 發送失敗:', err)
    return new Response(JSON.stringify({ error: 'Email 發送失敗' }), { status: 500 })
  }
}
