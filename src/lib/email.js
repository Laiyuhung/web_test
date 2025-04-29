import { Resend } from 'resend'

// 暫時直接寫死 API KEY（正式上線建議用 process.env）
const resend = new Resend('re_e6rMvxmn_JkqkxA1rhV6NDFoSbXtfWcSp')

export async function sendTradeNotificationEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // ✅ 測試用發信地址
      to,                             // ✅ 你會用 recipients.map(email => ...)
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
