// pages/api/email/send.js
import { sendTradeNotificationEmail } from '@/lib/email'

export default async function handler(req, res) {
  const { to, subject, html } = req.body

  try {
    const result = await sendTradeNotificationEmail(to, subject, html)
    res.status(200).json({ success: true, info: result })
  } catch (err) {
    console.error('❌ Email 發送失敗:', err)
    res.status(500).json({ error: 'Email 發送失敗' })
  }
}
