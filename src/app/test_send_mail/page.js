"use client";

const recipients = [
  "mar.hung.0708@gmail.com",
  "laiyuhung921118@gmail.com",
  "peter0984541203@gmail.com",
  "anthonylin6507@gmail.com"
];

export default function TestSendMailPage() {
  async function testEmailApi() {
    try {
      for (const email of recipients) {
        const response = await fetch(`/api/email/send?to=${encodeURIComponent(email)}&subject=${encodeURIComponent('測試郵件')}&html=${encodeURIComponent('<h1>這是一封測試郵件</h1>')}`, {
          method: 'GET',
        });

        const data = await response.json();
        console.log(`Response for ${email}:`, data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div>
      <h1>測試寄信</h1>
      <button onClick={testEmailApi}>寄送測試郵件</button>
    </div>
  );
}