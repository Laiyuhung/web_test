"use client";

import { useEffect, useState } from 'react';

const recipients = [
  "mar.hung.0708@gmail.com",
  "laiyuhung921118@gmail.com",
  "peter0984541203@gmail.com",
  "anthonylin6507@gmail.com"
];

export default function TestSendMailPage() {
  const [managerMap, setManagerMap] = useState({});

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await fetch('/api/managers');
        const data = await res.json();
        if (Array.isArray(data)) {
          const map = {};
          data.forEach(m => {
            map[m.id.toString()] = m.team_name;
          });
          setManagerMap(map);
        }
      } catch (err) {
        console.error('❌ 無法取得 manager 名單:', err);
      }
    };
    fetchManagers();
  }, []);

  async function testEmailApi() {
    try {
      console.log('Starting email sending process...');
      for (const email of recipients) {
        const teamName = managerMap[email] || '未知隊名';
        console.log(`Sending email to: ${email} with team name: ${teamName}`);

        const response = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: '測試郵件',
            html: `<h1>這是一封測試郵件</h1><p>隊名: ${teamName}</p>`,
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