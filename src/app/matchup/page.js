'use client'

import { useEffect, useState } from 'react'

export default function MatchupTable() {
  const [week, setWeek] = useState('W1')
  const [data, setData] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  const batterKeys = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
  const pitcherKeys = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']

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

        const allKeys = [...batterKeys, ...pitcherKeys]
        const scoreMap = {}

        allKeys.forEach(key => {
          const isAvgOrOps = ['AVG', 'OPS'].includes(key)
          const isEraOrWhip = ['ERA', 'WHIP'].includes(key)

          const values = data.map(d => ({
            team_name: d.team_name,
            value: parseFloat((d.batters[key] ?? d.pitchers[key]) || 0)
          }))

          values.sort((a, b) => {
            if (isAvgOrOps) return b.value - a.value
            if (isEraOrWhip) return a.value - b.value
            return b.value - a.value
          })

          const points = new Array(values.length).fill(0)
          let i = 0
          while (i < values.length) {
            let j = i
            while (j < values.length && values[j].value === values[i].value) j++
            const avgPoints = ((4 + 4 - (i + 1)) + (4 + 4 - j)) * (j - i) / 2 / (j - i)
            for (let k = i; k < j; k++) points[k] = avgPoints
            i = j
          }

          values.forEach((v, idx) => {
            if (!scoreMap[v.team_name]) scoreMap[v.team_name] = { total: 0, detail: {} }
            scoreMap[v.team_name].detail[key] = points[idx]
            scoreMap[v.team_name].total += points[idx]
          })
        })

        const scoreResult = data.map(d => ({
          team_name: d.team_name,
          total: scoreMap[d.team_name]?.total || 0,
          detail: scoreMap[d.team_name]?.detail || {}
        }))

        setScores(scoreResult)
      } catch (err) {
        console.error('❌ fetch weekSummary 錯誤:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [week])

  const renderScoreTable = () => (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#0155A0] mb-2">📊 Fantasy Points</h2>
      <table className="table-auto border w-full text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2 text-left">Team</th>
            {[...batterKeys, ...pitcherKeys].map((key) => (
              <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">{key}</th>
            ))}
            <th className="border px-3 py-2 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.team_name} className="text-sm">
              <td className="font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap">{s.team_name}</td>
              {[...batterKeys, ...pitcherKeys].map((key) => (
                <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                  {s.detail[key]?.toFixed(2) || '0.00'}
                </td>
              ))}
              <td className="border px-3 py-2 text-center font-bold">{s.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const formatStat = (key, val) => {
    const num = parseFloat(val)
    if (['AVG', 'OPS'].includes(key)) return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '.')
    if (['ERA', 'WHIP'].includes(key)) return isNaN(num) ? '0.00' : num.toFixed(2)
    return val
  }

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
