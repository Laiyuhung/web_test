// pages/api/email/send.js
import { sendTradeNotificationEmail } from '@/lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Incoming request:', {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    console.log('Missing required fields:', { to, subject, html });
    return res.status(400).json({ error: 'Missing required fields' });
  }

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
