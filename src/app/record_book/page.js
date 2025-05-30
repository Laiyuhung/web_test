'use client'

import { useEffect, useState } from 'react'

const batterKeys = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
const pitcherKeys = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
const allKeys = [
  ...batterKeys.map(k => ({ type: 'batters', key: k })),
  ...pitcherKeys.map(k => ({ type: 'pitchers', key: k })),
]

const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)
const lowerBetterKeys = ['K', 'GIDP', 'L', 'H', 'ER', 'BB', 'ERA', 'WHIP']

export default function RecordBook() {
  const [loading, setLoading] = useState(false)
  const [weeklyData, setWeeklyData] = useState([])
  const [bestRecords, setBestRecords] = useState({})
  const [worstRecords, setWorstRecords] = useState({})
  const [totals, setTotals] = useState({})
  const [currentWeekIdx, setCurrentWeekIdx] = useState(weeks.length)

  useEffect(() => {
    // 查找目前週次
    const fetchCurrentWeek = async () => {
      try {
        const res = await fetch('/api/getCurrentWeek')
        if (!res.ok) return
        const { week } = await res.json()
        const idx = weeks.findIndex(w => w === week)
        setCurrentWeekIdx(idx === -1 ? weeks.length : idx)
      } catch (err) {
        setCurrentWeekIdx(weeks.length)
      }
    }
    fetchCurrentWeek()
  }, [])

  useEffect(() => {
    if (currentWeekIdx === 0) return
    const fetchAllWeeks = async () => {
      setLoading(true)
      try {        const validWeeks = weeks.slice(0, currentWeekIdx + 1)
        // 改呼叫 sum 版 API
        const results = await Promise.all(
          validWeeks.map(week =>
            fetch('/api/weekly_stats_by_manager_sum', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ week }),
            })
              .then(res => res.json().then(data => ({ week, data })))
              .catch(() => ({ week, data: [] }))
          )
        )
        setWeeklyData(results)

        // 單週最佳/最差
        const best = {}
        const worst = {}
        for (const { week, data } of results) {
          for (const team of data) {
            for (const { type, key } of allKeys) {
              const value = team[type]?.[key]
              if (value === undefined || value === null) continue
              const numVal = isNaN(value) ? parseFloat(value) : Number(value)
              // 最佳
              if (!best[`${type}_${key}`]) {
                best[`${type}_${key}`] = { value: numVal, teams: [{ team: team.team_name, week, value }] }
              } else {
                const cmp = best[`${type}_${key}`].value
                const isLower = lowerBetterKeys.includes(key)
                if (
                  (isLower && numVal < cmp) ||
                  (!isLower && numVal > cmp)
                ) {
                  best[`${type}_${key}`] = { value: numVal, teams: [{ team: team.team_name, week, value }] }
                } else if (numVal === cmp) {
                  best[`${type}_${key}`].teams.push({ team: team.team_name, week, value })
                }
              }
              // 最差（只針對低為佳的數據）
              if (lowerBetterKeys.includes(key)) {
                if (!worst[`${type}_${key}`]) {
                  worst[`${type}_${key}`] = { value: numVal, teams: [{ team: team.team_name, week, value }] }
                } else {
                  const cmp = worst[`${type}_${key}`].value
                  if (numVal > cmp) {
                    worst[`${type}_${key}`] = { value: numVal, teams: [{ team: team.team_name, week, value }] }
                  } else if (numVal === cmp) {
                    worst[`${type}_${key}`].teams.push({ team: team.team_name, week, value })
                  }
                }
              }
            }
          }
        }
        setBestRecords(best)
        setWorstRecords(worst)

        // 各週累計
        const totalMap = {}
        for (const { data } of results) {
          for (const team of data) {
            const t = totalMap[team.team_name] ||= {
              batters: { AB: 0, H: 0, BB: 0, TB: 0, R: 0, HR: 0, RBI: 0, SB: 0, K: 0, GIDP: 0, XBH: 0 },
              pitchers: { OUT: 0, ER: 0, H: 0, BB: 0, W: 0, L: 0, HLD: 0, SV: 0, K: 0, QS: 0 }
            }
            // 打者累加
            t.batters.AB += Number(team.batters?.AB) || 0
            t.batters.H += Number(team.batters?.H) || 0
            t.batters.BB += Number(team.batters?.BB) || 0
            t.batters.TB += Number(team.batters?.TB) || 0
            t.batters.R += Number(team.batters?.R) || 0
            t.batters.HR += Number(team.batters?.HR) || 0
            t.batters.RBI += Number(team.batters?.RBI) || 0
            t.batters.SB += Number(team.batters?.SB) || 0
            t.batters.K += Number(team.batters?.K) || 0
            t.batters.GIDP += Number(team.batters?.GIDP) || 0
            t.batters.XBH += Number(team.batters?.XBH) || 0
            // 投手累加
            t.pitchers.OUT += Number(team.pitchers?.OUT) || 0
            t.pitchers.ER += Number(team.pitchers?.ER) || 0
            t.pitchers.H += Number(team.pitchers?.H) || 0
            t.pitchers.BB += Number(team.pitchers?.BB) || 0
            t.pitchers.W += Number(team.pitchers?.W) || 0
            t.pitchers.L += Number(team.pitchers?.L) || 0
            t.pitchers.HLD += Number(team.pitchers?.HLD) || 0
            t.pitchers.SV += Number(team.pitchers?.SV) || 0
            t.pitchers.K += Number(team.pitchers?.K) || 0
            t.pitchers.QS += Number(team.pitchers?.QS) || 0
          }
        }
        // 正確計算 AVG/OPS/ERA/WHIP
        for (const [team, t] of Object.entries(totalMap)) {
          // AVG
          t.batters.AVG = t.batters.AB ? (t.batters.H / t.batters.AB).toFixed(3).replace(/^0\./, '.') : '0.000'
          // OBP
          const obpDen = (t.batters.AB || 0) + (t.batters.BB || 0)
          const obpNum = (t.batters.H || 0) + (t.batters.BB || 0)
          const OBP = obpDen ? (obpNum / obpDen) : 0
          // SLG
          const SLG = t.batters.AB ? (t.batters.TB / t.batters.AB) : 0
          // OPS
          t.batters.OPS = (OBP + SLG).toFixed(3).replace(/^0\./, '.')
          // ERA/WHIP
          const OUT = t.pitchers.OUT || 0
          const fullInnings = Math.floor(OUT / 3)
          const outsRemainder = OUT % 3
          // IP 顯示為 x.0, x.1, x.2
          t.pitchers.IP = `${fullInnings}.${outsRemainder}`
          const IP = OUT ? OUT / 3 : 0
          t.pitchers.ERA = IP ? (9 * t.pitchers.ER / IP).toFixed(2) : '0.00'
          t.pitchers.WHIP = IP ? ((t.pitchers.H + t.pitchers.BB) / IP).toFixed(2) : '0.00'
        }
        setTotals(totalMap)
      } catch (err) {
        console.error('❌ record_book fetch error:', err)
      }
      setLoading(false)
    }
    fetchAllWeeks()
  }, [currentWeekIdx])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">RECORD BOOK</h1>
      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      {!loading && (
        <>
          {/* 新增：每週每隊數據 debug 區塊 */}
          <section className="mb-12">
            <h2 className="text-lg font-bold text-[#0155A0] mb-4">每週每隊數據 (Debug)</h2>
            {weeklyData.map(({ week, data }) => (
              <div key={week} className="mb-4">
                <h3 className="font-semibold mb-2">{week}</h3>
                <table className="table-auto border w-full text-xs mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1">球隊</th>
                      <th className="border px-2 py-1">AB</th>
                      <th className="border px-2 py-1">H</th>
                      <th className="border px-2 py-1">AVG</th>
                      <th className="border px-2 py-1">OPS</th>
                      <th className="border px-2 py-1">R</th>
                      <th className="border px-2 py-1">HR</th>
                      <th className="border px-2 py-1">RBI</th>
                      <th className="border px-2 py-1">SB</th>
                      <th className="border px-2 py-1">K</th>
                      <th className="border px-2 py-1">BB</th>
                      <th className="border px-2 py-1">TB</th>
                      <th className="border px-2 py-1">投手IP</th>
                      <th className="border px-2 py-1">投手H</th>
                      <th className="border px-2 py-1">ERA</th>
                      <th className="border px-2 py-1">WHIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(team => (
                      <tr key={team.team_name}>
                        <td className="border px-2 py-1">{team.team_name}</td>
                        <td className="border px-2 py-1">{team.batters.AB}</td>
                        <td className="border px-2 py-1">{team.batters.H}</td>
                        <td className="border px-2 py-1">{team.batters.AVG}</td>
                        <td className="border px-2 py-1">{team.batters.OPS}</td>
                        <td className="border px-2 py-1">{team.batters.R}</td>
                        <td className="border px-2 py-1">{team.batters.HR}</td>
                        <td className="border px-2 py-1">{team.batters.RBI}</td>
                        <td className="border px-2 py-1">{team.batters.SB}</td>
                        <td className="border px-2 py-1">{team.batters.K}</td>
                        <td className="border px-2 py-1">{team.batters.BB}</td>
                        <td className="border px-2 py-1">{team.batters.TB}</td>
                        <td className="border px-2 py-1">{team.pitchers.IP}</td>
                        <td className="border px-2 py-1">{team.pitchers.H}</td>
                        <td className="border px-2 py-1">{team.pitchers.ERA}</td>
                        <td className="border px-2 py-1">{team.pitchers.WHIP}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-lg font-bold text-[#0155A0] mb-4">單週最佳紀錄</h2>
            <div className="overflow-x-auto">
              <table className="table-auto border w-full text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-3 py-2 text-center">類型</th>
                    <th className="border px-3 py-2 text-center">數據</th>
                    <th className="border px-3 py-2 text-center">最佳值</th>
                    <th className="border px-3 py-2 text-center">球隊/週次</th>
                    <th className="border px-3 py-2 text-center">最差值</th>
                    <th className="border px-3 py-2 text-center">球隊/週次</th>
                  </tr>
                </thead>
                <tbody>
                  {allKeys.map(({ type, key }) => {
                    const rec = bestRecords[`${type}_${key}`]
                    const worst = lowerBetterKeys.includes(key) ? worstRecords[`${type}_${key}`] : null
                    if (!rec && !worst) return null
                    return (
                      <tr key={`${type}_${key}`}>
                        <td className="border px-3 py-2 text-center">{type === 'batters' ? '打者' : '投手'}</td>
                        <td className="border px-3 py-2 text-center">{key}</td>
                        <td className="border px-3 py-2 text-center font-bold text-[#0155A0]">{rec?.value ?? '-'}</td>
                        <td className="border px-3 py-2 text-center">
                          {rec?.teams?.map((t, i) => (
                            <span key={i} className="inline-block mr-2">
                              {t.team} ({t.week})
                            </span>
                          )) ?? '-'}
                        </td>
                        <td className="border px-3 py-2 text-center font-bold text-red-600">
                          {worst?.value ?? (lowerBetterKeys.includes(key) ? '-' : '')}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {worst?.teams?.map((t, i) => (
                            <span key={i} className="inline-block mr-2">
                              {t.team} ({t.week})
                            </span>
                          )) ?? (lowerBetterKeys.includes(key) ? '-' : '')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0155A0] mb-4">W1~W{currentWeekIdx} 各隊累計</h2>
            <div className="overflow-x-auto mb-8">
              <h3 className="font-semibold mb-2">打者累計</h3>
              <table className="table-auto border w-full text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-3 py-2 text-center">球隊</th>
                    <th className="border px-3 py-2 text-center">AB</th>
                    {batterKeys.filter(k => !["AVG", "OPS"].includes(k)).map(k => (
                      <th key={k} className="border px-3 py-2 text-center">{k}</th>
                    ))}
                    <th className="border px-3 py-2 text-center">AVG</th>
                    <th className="border px-3 py-2 text-center">OPS</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals).map(([team, t]) => (
                    <tr key={team}>
                      <td className="border px-3 py-2 text-left font-bold bg-gray-100">{team}</td>
                      <td className="border px-3 py-2 text-center">{t.batters.AB || 0}</td>
                      {batterKeys.filter(k => !["AVG", "OPS"].includes(k)).map(k => (
                        <td key={k} className="border px-3 py-2 text-center">{t.batters[k] || 0}</td>
                      ))}
                      <td className="border px-3 py-2 text-center">{t.batters.AVG}</td>
                      <td className="border px-3 py-2 text-center">{t.batters.OPS}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <h3 className="font-semibold mb-2">投手累計</h3>
              <table className="table-auto border w-full text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-3 py-2 text-center">球隊</th>
                    <th className="border px-3 py-2 text-center">IP</th>
                    {pitcherKeys.filter(k => !["ERA", "WHIP"].includes(k)).map(k => (
                      <th key={k} className="border px-3 py-2 text-center">{k}</th>
                    ))}
                    <th className="border px-3 py-2 text-center">ERA</th>
                    <th className="border px-3 py-2 text-center">WHIP</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals).map(([team, t]) => (
                    <tr key={team}>
                      <td className="border px-3 py-2 text-left font-bold bg-gray-100">{team}</td>
                      <td className="border px-3 py-2 text-center">{t.pitchers.IP}</td>
                      {pitcherKeys.filter(k => !["ERA", "WHIP"].includes(k)).map(k => (
                        <td key={k} className="border px-3 py-2 text-center">{t.pitchers[k] || 0}</td>
                      ))}
                      <td className="border px-3 py-2 text-center">{t.pitchers.ERA}</td>
                      <td className="border px-3 py-2 text-center">{t.pitchers.WHIP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}