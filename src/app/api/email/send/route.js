// pages/api/email/send.js
import nodemailer from 'nodemailer';

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

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error('EMAIL_USER 或 EMAIL_PASS 未設定在環境變數中');
    return res.status(500).json({ error: 'EMAIL_USER 或 EMAIL_PASS 未設定在環境變數中' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const mailOptions = {
    from: user,
    to,
    subject,
    html,
  };

  try {
    console.log('Attempting to send email with:', { to, subject, html });
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.response);
    res.status(200).json({ success: true, info });
  } catch (err) {
    console.error('❌ Email 發送失敗:', err);
    res.status(500).json({ error: 'Email 發送失敗' });
  }
}
