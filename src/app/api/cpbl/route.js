import { NextResponse } from 'next/server';
import cheerio from 'cheerio';

export async function GET() {
  const res = await fetch('https://www.cpbl.com.tw/box/index?year=2025&kindCode=A&gameSno=313', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // 標題
  const title = $('title').text();

  // 比賽資訊（日期、場地、主客隊、戰績）
  let infoText = $('body').text();
  const dateMatch = infoText.match(/(\d{4}\/\d{2}\/\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';
  const teamsMatch = infoText.match(/(台鋼雄鷹|味全龍|中信兄弟|統一7-ELEVEn獅|樂天桃猿|富邦悍將)[^\n]*VS\.[^\n]*(台鋼雄鷹|味全龍|中信兄弟|統一7-ELEVEn獅|樂天桃猿|富邦悍將)/);
  let homeTeam = '', awayTeam = '';
  if (teamsMatch) {
    [awayTeam, homeTeam] = [teamsMatch[1], teamsMatch[2]];
  }

  // 場地
  const fieldMatch = infoText.match(/(大巨蛋|洲際|新莊|台南|澄清湖|天母|桃園|斗六|花蓮|嘉義市|立德|屏東|義大|台中|台北|台東|雲林|宜蘭|高雄|台中洲際|台北大巨蛋)/);
  const field = fieldMatch ? fieldMatch[1] : '';

  // 裁判
  const umpireMatch = infoText.match(/主審([\u4e00-\u9fa5]+)\s*一壘審([\u4e00-\u9fa5]+)\s*二壘審([\u4e00-\u9fa5]+)\s*三壘審([\u4e00-\u9fa5]+)/);
  const umpires = umpireMatch ? {
    home: umpireMatch[1],
    first: umpireMatch[2],
    second: umpireMatch[3],
    third: umpireMatch[4],
  } : {};

  // 打者名單
  const batters = [];
  $('h3:contains("打擊成績")').nextAll('table').first().find('tr').each((i, el) => {
    const tds = $(el).find('td');
    if (tds.length > 1) {
      const name = $(tds[0]).text().trim();
      if (name) batters.push(name);
    }
  });

  // 投手名單
  const pitchers = [];
  $('h3:contains("投手成績")').nextAll('table').first().find('tr').each((i, el) => {
    const tds = $(el).find('td');
    if (tds.length > 0) {
      const name = $(tds[0]).text().trim();
      if (name) pitchers.push(name);
    }
  });

  // 回傳所有資訊
  return NextResponse.json({
    title,
    date,
    field,
    homeTeam,
    awayTeam,
    umpires,
    batters,
    pitchers
  });
}