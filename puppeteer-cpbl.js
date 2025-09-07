// puppeteer-cpbl.js
// 用 Puppeteer 爬取 CPBL 比賽網頁渲染後的內容

const puppeteer = require('puppeteer');

async function main() {
  const url = 'https://www.cpbl.com.tw/box/index?year=2025&kindCode=A&gameSno=313';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 取得比賽標題
  const title = await page.title();




  // 取得所有打擊成績表格（主隊/客隊各一個）
  const battersTables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.RecordTableWrap .RecordTable table')).map(table => table.outerHTML);
  });

  // 取得投手成績表格的 HTML（往下搜尋最近的 table）
  const pitchersTable = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3'));
    const h3 = h3s.find(h => h.textContent.includes('投手成績'));
    if (h3) {
      let el = h3;
      while (el && el.nextElementSibling) {
        el = el.nextElementSibling;
        if (el.tagName === 'TABLE') return el.outerHTML;
      }
    }
    return '';
  });

  // 你可以根據需要繼續擴充更多欄位

  // 解析打擊成績表格內容
  const parseBattersTable = (tableHTML) => {
    const temp = document.createElement('div');
    temp.innerHTML = tableHTML;
    const rows = temp.querySelectorAll('table tr');
    const result = [];
    for (let i = 1; i < rows.length; i++) { // 跳過表頭
      const tds = rows[i].querySelectorAll('td');
      if (tds.length < 2) continue;
      // 解析順序、姓名、守位
      const order = tds[0].querySelector('.order')?.textContent.trim() || '';
      const name = tds[0].querySelector('.name')?.textContent.trim() || '';
      const position = tds[0].querySelector('.position')?.textContent.trim() || '';
      // 解析打數、安打、全壘打、打點、得分、打擊率（表格最後6欄）
      const num = (idx) => tds[tds.length - 6 + idx]?.textContent.trim() || '';
      result.push({
        order,
        name,
        position,
        at_bats: num(0),
        hits: num(1),
        hr: num(2),
        rbi: num(3),
        runs: num(4),
        avg: num(5)
      });
    }
    return result;
  };


  // 用 Puppeteer 的 page.evaluate 解析 HTML，根據新表頭對應所有欄位
  const battersData = await page.evaluate((tables) => {
    const parseBattersTable = (tableHTML) => {
      const temp = document.createElement('div');
      temp.innerHTML = tableHTML;
      const rows = temp.querySelectorAll('table tr');
      if (rows.length < 2) return [];
      // 取得表頭
      const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
      const result = [];
      for (let i = 1; i < rows.length; i++) { // 跳過表頭
        const tds = rows[i].querySelectorAll('td');
        if (tds.length < 2) continue;
        // 解析順序、姓名、守位
        const order = tds[0].querySelector('.order')?.textContent.trim() || '';
        const name = tds[0].querySelector('.name')?.textContent.trim() || '';
        const position = tds[0].querySelector('.position')?.textContent.trim() || '';
        // 解析所有數據欄位
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

  console.log(JSON.stringify({ title, battersData, pitchersTable }, null, 2));

  await browser.close();
}

main();
