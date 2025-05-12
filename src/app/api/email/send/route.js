// pages/api/email/send.js
import { sendTradeNotificationEmail } from '@/lib/email';

export default async function handler(req, res) {
  console.log('Incoming request:', {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  const { to, subject, html } = req.body;

  try {
    console.log('Attempting to send email with:', { to, subject, html });
    const result = await sendTradeNotificationEmail(to, subject, html);
    console.log('Email sent successfully:', result);
    res.status(200).json({ success: true, info: result });
  } catch (err) {
    console.error('❌ Email 發送失敗:', err);
    res.status(500).json({ error: 'Email 發送失敗' });
  }
}
