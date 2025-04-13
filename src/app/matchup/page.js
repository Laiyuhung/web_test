'use client'

import { useEffect, useState } from 'react'

export default function MatchupTable() {
  const [week, setWeek] = useState('W1')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  const batterKeys = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
  const pitcherKeys = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
  const pointKeys = [...batterKeys, ...pitcherKeys]

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

  const formatStat = (key, val) => {
    const num = parseFloat(val)
    if (['AVG', 'OPS'].includes(key)) return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '.')
    if (['ERA', 'WHIP'].includes(key)) return isNaN(num) ? '0.00' : num.toFixed(2)
    return val
  }

  const renderScoreTable = () => (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#0155A0] mb-2">📊 Fantasy Points</h2>
      <table className="table-auto border w-full text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2 text-left">Team</th>
            {pointKeys.map((key) => (
              <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">{key}</th>
            ))}
            <th className="border px-3 py-2 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.team_name} className="text-sm">
              <td className="font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap">{d.team_name}</td>
              {pointKeys.map((key) => (
                <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                  {d.fantasyPoints?.detail?.[key]?.toFixed(2) || '0.00'}
                </td>
              ))}
              <td className="border px-3 py-2 text-center font-bold">{d.fantasyPoints?.total?.toFixed(2) || '0.00'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderStatTable = (title, keys, type) => (
    <div>
      <h2 className="text-base font-bold text-[#0155A0] mb-2">{title} Total</h2>
      <table className="table-auto border w-full text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2 text-left">Team</th>
            {keys.map((key) => (
              <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.team_name} className="text-sm">
              <td className="font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap">{d.team_name}</td>
              {keys.map((key) => (
                <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                  {formatStat(key, d[type][key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Matchup Summary</h1>

      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-semibold">Select Week:</label>
        <select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          {weeks.map(w => <option key={w}>{w}</option>)}
        </select>
      </div>

      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto space-y-12">
          {renderScoreTable()}
          {renderStatTable('Batters', batterKeys, 'batters')}
          {renderStatTable('Pitchers', pitcherKeys, 'pitchers')}
        </div>
      )}
    </div>
  )
}
