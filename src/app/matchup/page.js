'use client'

import { useEffect, useState } from 'react'

export default function MatchupPage() {
  const [week, setWeek] = useState('W1')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedManager, setSelectedManager] = useState('All')

  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12', 'W13', 'W14', 'W15', 'W16', 'W17', 'W18']

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/weekSummary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week })
        })
        const result = await res.json()
        console.log('✅ API 回傳資料:', result)
        setData(result)
      } catch (err) {
        console.error('❌ fetch weekSummary 錯誤:', err)
      }
      setLoading(false)
    }

    fetchData()
  }, [week])

  const renderBatters = (bat) => (
    <div className="text-sm text-gray-700">
      <div className="grid grid-cols-13 gap-2 mb-1">
        {['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map((key) => (
          <div key={key} className="font-bold text-[#0155A0] text-center">{bat[key]}</div>
        ))}
      </div>
    </div>
  )

  const renderPitchers = (pit) => (
    <div className="text-sm text-gray-700">
      <div className="grid grid-cols-13 gap-2">
        {['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map((key) => (
          <div key={key} className="font-bold text-[#0155A0] text-center">{pit[key]}</div>
        ))}
      </div>
    </div>
  )

  const filteredData = selectedManager === 'All'
    ? data
    : data.filter(d => d.manager_id.toString() === selectedManager)

  console.log('🔎 篩選後資料:', filteredData)

  const uniqueManagers = [...new Set(data.map(d => d.manager_id.toString()))]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Matchup Summary</h1>

      <div className="flex gap-4 mb-4">
        <div>
          <label className="font-semibold text-sm">Select Week:</label>
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="ml-2 px-3 py-1 border rounded"
          >
            {weeks.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-sm">Select Manager:</label>
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            className="ml-2 px-3 py-1 border rounded"
          >
            <option value="All">All</option>
            {uniqueManagers.map(mid => (
              <option key={mid} value={mid}>Manager #{mid}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      <div className="space-y-6">
        {filteredData.map((d) => (
          <div key={d.manager_id} className="border rounded p-4 bg-white shadow">
            <h2 className="font-bold text-lg mb-2">Manager #{d.manager_id}</h2>

            <h3 className="text-sm font-semibold text-gray-600 mb-1">Batters</h3>
            {renderBatters(d.batters)}

            <h3 className="text-sm font-semibold text-gray-600 mt-4 mb-1">Pitchers</h3>
            {renderPitchers(d.pitchers)}
          </div>
        ))}
      </div>
    </div>
  )
}
