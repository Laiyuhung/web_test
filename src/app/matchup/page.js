// MatchupTable.js
'use client'

import { useEffect, useState } from 'react'

export default function MatchupTable() {
  const [week, setWeek] = useState('W1')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/weekly_stats_by_manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week })
        })
        const result = await res.json()
        console.log('📦 回傳資料:', result)
        setData(result)
      } catch (err) {
        console.error('❌ fetch weekSummary 錯誤:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [week])

  const renderStatRow = (label, key, isPitcher = false) => (
    <tr className="text-sm">
      <td className="font-bold border px-2 py-1 text-left bg-gray-100">{label}</td>
      {data.map((d) => (
        <td key={d.manager_id} className="border px-2 py-1 text-center text-[#0155A0] font-semibold">
          {isPitcher && key === 'IP' ? d.pitchers[key] : d[isPitcher ? 'pitchers' : 'batters'][key] ?? 0}
        </td>
      ))}
    </tr>
  )

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Matchup Summary</h1>

      <div className="mb-4 flex gap-4 items-center">
        <label className="text-sm font-semibold">Select Week:</label>
        <select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="px-2 py-1 border rounded text-sm"
        >
          {weeks.map(w => <option key={w}>{w}</option>)}
        </select>
      </div>

      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      {data.length > 0 && (
        <div className="overflow-x-auto space-y-12">

          {/* 🟦 Batters Table */}
          <div>
            <h2 className="text-base font-bold text-[#0155A0] mb-2">Batters Total</h2>
            <table className="table-auto border w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2 py-1">Stat</th>
                  {data.map((d) => (
                    <th key={d.manager_id} className="border px-2 py-1">Manager #{d.manager_id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderStatRow('AB', 'AB')}
                {renderStatRow('R', 'R')}
                {renderStatRow('H', 'H')}
                {renderStatRow('HR', 'HR')}
                {renderStatRow('RBI', 'RBI')}
                {renderStatRow('SB', 'SB')}
                {renderStatRow('K', 'K')}
                {renderStatRow('BB', 'BB')}
                {renderStatRow('GIDP', 'GIDP')}
                {renderStatRow('XBH', 'XBH')}
                {renderStatRow('TB', 'TB')}
                {renderStatRow('AVG', 'AVG')}
                {renderStatRow('OPS', 'OPS')}
              </tbody>
            </table>
          </div>

          {/* 🟦 Pitchers Table */}
          <div>
            <h2 className="text-base font-bold text-[#0155A0] mb-2">Pitchers Total</h2>
            <table className="table-auto border w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2 py-1">Stat</th>
                  {data.map((d) => (
                    <th key={d.manager_id} className="border px-2 py-1">Manager #{d.manager_id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderStatRow('IP', 'IP', true)}
                {renderStatRow('W', 'W', true)}
                {renderStatRow('L', 'L', true)}
                {renderStatRow('HLD', 'HLD', true)}
                {renderStatRow('SV', 'SV', true)}
                {renderStatRow('H', 'H', true)}
                {renderStatRow('ER', 'ER', true)}
                {renderStatRow('K', 'K', true)}
                {renderStatRow('BB', 'BB', true)}
                {renderStatRow('QS', 'QS', true)}
                {renderStatRow('OUT', 'OUT', true)}
                {renderStatRow('ERA', 'ERA', true)}
                {renderStatRow('WHIP', 'WHIP', true)}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}
