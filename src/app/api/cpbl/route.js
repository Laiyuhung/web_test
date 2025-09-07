import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('https://www.cpbl.com.tw/box/index?year=2025&kindCode=A&gameSno=313', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();

  // 這裡用簡單的正則或 DOMParser 取出你要的資訊
  // 以例：抓取標題
  const match = html.match(/<title>(.*?)<\/title>/);
  const title = match ? match[1] : '無法取得標題';

  return NextResponse.json({ title });
}