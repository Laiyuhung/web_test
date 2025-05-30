'use client'

import { useEffect, useState } from 'react'

export default function MatchupTable() {
  const [week, setWeek] = useState(null)
  const [dateRange, setDateRange] = useState('')  // 用來顯示日期區間
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  const batterKeys = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
  const pitcherKeys = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
  const pointKeys = [
    ...batterKeys.map(k => `b_${k}`),
    ...pitcherKeys.map(k => `p_${k}`)
  ]
  


  useEffect(() => {
    const fetchDefaultWeek = async () => {
      try {
        const res = await fetch('/api/getCurrentWeek')
        if (!res.ok) return
        const { week, start, end } = await res.json()
        setWeek(week)
        setDateRange(`${start} ~ ${end}`)
      } catch (err) {
        console.error('❌ 取得本週週次失敗:', err)
      }
    }
    fetchDefaultWeek()
  }, [])

  useEffect(() => {
    if (!week) return  // ✅ 還沒抓到週次時不查
    const fetchData = async () => {
      setLoading(true)
      try {
        // 撈該週的數據
        const res = await fetch('/api/weekly_stats_by_manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week })
        })
        const result = await res.json()
  
        // 排名處理：依照 fantasyPoints.Total 排序
        result.sort((a, b) => parseFloat(b.fantasyPoints?.Total || '0') - parseFloat(a.fantasyPoints?.Total || '0'))
        result.forEach((r, i) => r.rank = i + 1)
        setData(result)
  
        // 🔥 加這段：撈該週的日期區間
        const rangeRes = await fetch('/api/getCurrentWeek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week })
        })
        const { start, end } = await rangeRes.json()
        setDateRange(`${start} ~ ${end}`)
  
      } catch (err) {
        console.error('❌ fetch weekSummary 或日期區間錯誤:', err)
      }
      setLoading(false)
    }
  
    fetchData()
  }, [week])
  

  const renderScoreTable = () => (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#0155A0] mb-2">Fantasy Points</h2>
      <div className="overflow-x-auto">
      <table className="table-auto border w-full text-sm">
        <thead>
            <tr className="bg-gray-200">
                <th className="border px-3 py-2 text-center">Rank</th>
                <th className="border px-3 py-2 text-left">Team</th>
                {pointKeys.map((key) => (
                  <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">
                    {key.slice(2)}  {/* 拿掉 b_ / p_ 前綴，只顯示像 K、BB、OPS 等 */}
                  </th>
                ))}
                <th className="border px-3 py-2 text-center">Total</th>
            </tr>
        </thead>
        <tbody>
            {data.map((d) => (
                <tr key={d.team_name} className="text-sm">
                <td className="border px-3 py-2 text-center font-bold text-[#0155A0]">{d.rank}</td>
                <td className="font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap">{d.team_name}</td>
                {pointKeys.map((key) => {
                  const value = key.startsWith('b_')
                    ? d.batters?.fantasyPoints?.[key.slice(2)] ?? '0.0'
                    : d.pitchers?.fantasyPoints?.[key.slice(2)] ?? '0.0'

                  return (
                    <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                      {value}
                    </td>
                  )
                })}

                <td className="border px-3 py-2 text-center font-bold">{d.fantasyPoints?.Total || '0.0'}</td>
                </tr>
            ))}
        </tbody>
      </table>
      </div>
    </div>
  )

  const renderStatTable = (title, keys, type) => (
    <div>
      <h2 className="text-base font-bold text-[#0155A0] mb-2">{title} Total</h2>
      <div className="overflow-x-auto">
      <table className="table-auto border w-full text-sm">
        <thead>
            <tr className="bg-gray-200">
                <th className="border px-3 py-2 text-center">Rank</th>
                <th className="border px-3 py-2 text-left">Team</th>
                {keys.map((key) => (
                <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">{key}</th>
                ))}
            </tr>
        </thead>
        <tbody>
            {data.map((d) => (
                <tr key={d.team_name} className="text-sm">
                <td className="border px-3 py-2 text-center font-bold text-[#0155A0]">{d.rank}</td>
                <td className="font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap">{d.team_name}</td>
                {keys.map((key) => (
                    <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                    {d[type][key]}
                    </td>
                ))}
                </tr>
            ))}
        </tbody>

      </table>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">MATCHUP</h1>

      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-semibold">Select Week:</label>
        <select
          value={week ?? ''}
          onChange={(e) => setWeek(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="" disabled>週次</option> {/* 初始提示 */}
          {weeks.map(w => <option key={w}>{w}</option>)}
        </select>


        {dateRange && (
            <p className="mt-1 text-sm text-gray-500">本週日期：{dateRange}</p>
        )}
      </div>

      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto space-y-12">
          {renderScoreTable()}
          {renderStatTable('Batters', ['AB', ...batterKeys], 'batters')}
          {renderStatTable('Pitchers', ['IP', ...pitcherKeys], 'pitchers')}

        </div>
      )}
    </div>
  )
}
