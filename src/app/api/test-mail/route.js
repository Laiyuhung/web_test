import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req) {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    console.error('❌ EMAIL_USER 或 EMAIL_PASS 未設定在環境變數中')
    return NextResponse.json({ error: '伺服器未設定寄信帳號' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  const testRecipient = '你想測試寄信的目標@gmail.com'
  const testSubject = '測試寄信 ✅'
  const testHtml = `<p>這是一封測試信，寄信時間：${new Date().toLocaleString()}</p>`

  try {
    const info = await transporter.sendMail({
      from: user,
      to: testRecipient,
      subject: testSubject,
      html: testHtml,
    })

    console.log('✅ 測試信已送出:', info.response)
    return NextResponse.json({ message: '測試寄信成功', response: info.response })
  } catch (err) {
    console.error('❌ 測試寄信失敗:', err)
    return NextResponse.json({ error: '測試寄信失敗', details: err.message }, { status: 500 })
  }
}
