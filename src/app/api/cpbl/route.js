import { NextResponse } from 'next/server';


export async function GET() {
  const res = await fetch('https://www.cpbl.com.tw/box/getlive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      gameSno: 313,
      year: 2025,
      kindCode: 'A'
    })
  });
  const data = await res.json();
  return NextResponse.json(data);
}