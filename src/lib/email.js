import nodemailer from 'nodemailer'

export async function sendTradeNotificationEmail(to, subject, message) {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    throw new Error('EMAIL_USER 或 EMAIL_PASS 未設定在環境變數中')
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  const mailOptions = {
    from: user,
    to,
    subject,
    html: message,
  }

  const info = await transporter.sendMail(mailOptions)
  console.log('✅ Email sent:', info.response)
  return info
}
