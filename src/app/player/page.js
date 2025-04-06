'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PlayerPage() {
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('batter')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [stats, setStats] = useState([])

  useEffect(() => {
    fetch('/api/playerStatus')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlayers(data)
        else setError('資料格式錯誤')
      })
      .catch(err => {
        console.error('API 錯誤:', err)
        setError('無法載入球員資料')
      })
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/playerStats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, from: fromDate, to: toDate })
      })
      const data = await res.json()
      if (Array.isArray(data)) setStats(data)
      else setError('統計資料格式錯誤')
    } catch (err) {
      console.error('統計錯誤:', err)
      setError('統計讀取失敗')
    }
    setLoading(false)
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">球員狀態列表</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <Card className="mb-6">
        <CardContent className="overflow-auto p-4">
          <table className="w-full text-sm text-center border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">球員姓名</th>
                <th className="p-2 border">狀態</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={i}>
                  <td className="p-2 border">
                    {p.Name} <span className="text-xs text-gray-500">({p.Team} / {p.Identity})</span>
                  </td>
                  <td className="p-2 border">
                    {p.owner && p.owner !== '-' ? `On Team - ${p.owner}` : p.status === 'Waiver' ? 'Waiver (off waivers)' : p.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <h2 className="text-lg font-bold mb-2">球員數據統計</h2>
      <div className="flex gap-4 items-center mb-4">
        <select value={type} onChange={e => setType(e.target.value)} className="border px-2 py-1 rounded">
          <option value="batter">打者</option>
          <option value="pitcher">投手</option>
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-2 py-1 rounded" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-2 py-1 rounded" />
        <Button onClick={fetchStats}>查詢</Button>
      </div>
      {loading && <div className="mb-4">讀取中...</div>}
      {stats.length > 0 && (
        <Card>
          <CardContent className="overflow-auto p-4">
            <table className="text-xs w-full text-center">
              <thead>
                <tr>
                  {Object.keys(stats[0]).map((key, idx) => (
                    <th key={idx} className="border p-1 bg-gray-100">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="border p-1">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
