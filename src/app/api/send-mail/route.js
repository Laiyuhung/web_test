import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// 🛡️ 環境變數（建議設在 .env.local）
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',         // ✅ 可用 Gmail SMTP、Outlook、Mailgun 等
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,  // 你的 email
    pass: process.env.SMTP_PASS   // 應用程式密碼 / Mailgun 密鑰
  }
})

export async function POST(req) {
  const { to, subject, html } = await req.json()

  try {
    const info = await transporter.sendMail({
      from: `"Fantasy 管理員" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    })
    console.log('📧 信件已送出:', info.messageId)
    return NextResponse.json({ success: true, id: info.messageId })
  } catch (err) {
    console.error('❌ 發信錯誤:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
