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
      console.log('Starting email sending process...');
      for (const email of recipients) {
        console.log(`Sending email to: ${email}`);
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: '測試郵件',
            html: '<h1>這是一封測試郵件</h1>',
          }),
        });

        console.log(`Response status for ${email}:`, response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error for ${email}:`, errorText);
          continue;
        }

        const data = await response.json();
        console.log(`Response data for ${email}:`, data);
      }
      console.log('Email sending process completed.');
    } catch (error) {
      console.error('Unexpected Error:', error);
    }
  }

  return (
    <div>
      <h1>測試寄信</h1>
      <button onClick={testEmailApi}>寄送測試郵件</button>
    </div>
  );
}