// MatchupTable.js
'use client'

import { useEffect, useState } from 'react'

export default function MatchupTable() {
  const [week, setWeek] = useState('W1')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const weeks = [
    'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9',
    'W10', 'W11', 'W12', 'W13', 'W14', 'W15', 'W16', 'W17', 'W18'
  ]

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
        setData(result)
      } catch (err) {
        console.error('❌ Fetch Error:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [week])

  const battingKeys = ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
  const pitchingKeys = ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Matchup Summary</h1>

      <div className="mb-4 flex items-center gap-3">
        <label className="font-semibold">Select Week:</label>
        <select
          value={week}
          onChange={e => setWeek(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {weeks.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {loading && <p>Loading...</p>}

      {/* 🟦 Batting 表格 */}
      <h2 className="text-xl font-bold mt-8 mb-2">Batters Total</h2>
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm text-center border">
          <thead className="bg-gray-200">
            <tr>
              <th>Manager</th>
              {battingKeys.map(k => <th key={k}>{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => (
              <tr key={idx} className="border-t">
                <td className="font-bold text-left px-2">#{d.manager_id}</td>
                {battingKeys.map(k => <td key={k}>{d.batters[k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🟦 Pitching 表格 */}
      <h2 className="text-xl font-bold mt-8 mb-2">Pitchers Total</h2>
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm text-center border">
          <thead className="bg-gray-200">
            <tr>
              <th>Manager</th>
              {pitchingKeys.map(k => <th key={k}>{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => (
              <tr key={idx} className="border-t">
                <td className="font-bold text-left px-2">#{d.manager_id}</td>
                {pitchingKeys.map(k => <td key={k}>{d.pitchers[k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
