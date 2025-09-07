import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'cpbl.json');
  const json = await fs.readFile(filePath, 'utf-8');
  return NextResponse.json(JSON.parse(json));
}
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET() {
  const url = 'https://www.cpbl.com.tw/box/index?year=2025&kindCode=A&gameSno=313';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 取得所有打擊成績表格
  const battersTables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.RecordTableWrap .RecordTable table')).map(table => table.outerHTML);
  });

  // 解析表格內容
  const battersData = await page.evaluate((tables) => {
    const parseBattersTable = (tableHTML) => {
      const temp = document.createElement('div');
      temp.innerHTML = tableHTML;
      const rows = temp.querySelectorAll('table tr');
      if (rows.length < 2) return [];
      const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
      const result = [];
      for (let i = 1; i < rows.length; i++) {
        const tds = rows[i].querySelectorAll('td');
        if (tds.length < 2) continue;
        const order = tds[0].querySelector('.order')?.textContent.trim() || '';
        const name = tds[0].querySelector('.name')?.textContent.trim() || '';
        const position = tds[0].querySelector('.position')?.textContent.trim() || '';
        const stats = {};
        for (let j = 1; j < tds.length; j++) {
          stats[headers[j] || `col${j}`] = tds[j].textContent.trim();
        }
        result.push({ order, name, position, ...stats });
      }
      return result;
    };
    return tables.map(parseBattersTable);
  }, battersTables);

  await browser.close();

  return NextResponse.json({ battersData });
}