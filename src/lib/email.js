import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTradeNotificationEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Fantasy Baseball <your@email.com>', // 這個 from 要跟 Resend 驗證的 domain 有關
      to,
      subject,
      html,
    })

    if (error) {
      console.error('❌ 發信失敗:', error)
    } else {
      console.log('✅ 發信成功:', data)
    }
  } catch (err) {
    console.error('❌ 發信過程錯誤:', err)
  }
}
