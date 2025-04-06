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

  const fetchStatsAndStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/playerStatus'),
        fetch('/api/playerStats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, from: fromDate, to: toDate })
        })
      ])
      const [statusData, statsData] = await Promise.all([
        statusRes.json(),
        statsRes.ok ? statsRes.json() : Promise.resolve([])
      ])

      if (!Array.isArray(statusData)) throw new Error('狀態資料錯誤')

      const merged = statusData.map(p => {
        const stat = statsData.find(s => s.name === p.Name)
        return { ...p, ...(stat || {}) }
      })
      setPlayers(merged)
    } catch (err) {
      console.error('統計錯誤:', err)
      setError('統計讀取失敗')
    }
    setLoading(false)
  }

  const formatDate = (str) => {
    const d = new Date(str)
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">球員狀態與數據</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="flex gap-4 items-center mb-4">
        <select value={type} onChange={e => setType(e.target.value)} className="border px-2 py-1 rounded">
          <option value="batter">打者</option>
          <option value="pitcher">投手</option>
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-2 py-1 rounded" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-2 py-1 rounded" />
        <Button onClick={fetchStatsAndStatus}>查詢</Button>
      </div>

      {loading && <div className="mb-4">讀取中...</div>}

      <Card>
        <CardContent className="overflow-auto p-4">
          <table className="text-xs w-full text-center border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">姓名</th>
                <th className="p-2 border">狀態</th>
                {type === 'batter' ? (
                  <>
                    <th className="p-2 border">AB</th>
                    <th className="p-2 border">R</th>
                    <th className="p-2 border">H</th>
                    <th className="p-2 border">HR</th>
                    <th className="p-2 border">RBI</th>
                    <th className="p-2 border">SB</th>
                    <th className="p-2 border">K</th>
                    <th className="p-2 border">BB</th>
                    <th className="p-2 border">GIDP</th>
                    <th className="p-2 border">XBH</th>
                    <th className="p-2 border">TB</th>
                    <th className="p-2 border">AVG</th>
                    <th className="p-2 border">OPS</th>
                  </>
                ) : (
                  <>
                    <th className="p-2 border">IP</th>
                    <th className="p-2 border">W</th>
                    <th className="p-2 border">L</th>
                    <th className="p-2 border">HLD</th>
                    <th className="p-2 border">SV</th>
                    <th className="p-2 border">H</th>
                    <th className="p-2 border">ER</th>
                    <th className="p-2 border">K</th>
                    <th className="p-2 border">BB</th>
                    <th className="p-2 border">QS</th>
                    <th className="p-2 border">OUT</th>
                    <th className="p-2 border">ERA</th>
                    <th className="p-2 border">WHIP</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={i}>
                  <td className="p-2 border">
                    {p.Name} <span className="text-xs text-gray-500">({p.Team} / {p.Identity})</span>
                  </td>
                  <td className="p-2 border">
                    {p.owner && p.owner !== '-' ? `On Team - ${p.owner}` : p.status === 'Waiver' ? `off waivers ${formatDate(p.offWaivers)}` : p.status}
                  </td>
                  {type === 'batter' ? (
                    <>
                      <td className="p-2 border">{p.AB || 0}</td>
                      <td className="p-2 border">{p.R || 0}</td>
                      <td className="p-2 border">{p.H || 0}</td>
                      <td className="p-2 border">{p.HR || 0}</td>
                      <td className="p-2 border">{p.RBI || 0}</td>
                      <td className="p-2 border">{p.SB || 0}</td>
                      <td className="p-2 border">{p.K || 0}</td>
                      <td className="p-2 border">{p.BB || 0}</td>
                      <td className="p-2 border">{p.GIDP || 0}</td>
                      <td className="p-2 border">{p.XBH || 0}</td>
                      <td className="p-2 border">{p.TB || 0}</td>
                      <td className="p-2 border">{formatAvg(p.AVG)}</td>
                      <td className="p-2 border">{formatAvg(p.OPS)}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 border">{p.IP || 0}</td>
                      <td className="p-2 border">{p.W || 0}</td>
                      <td className="p-2 border">{p.L || 0}</td>
                      <td className="p-2 border">{p.HLD || 0}</td>
                      <td className="p-2 border">{p.SV || 0}</td>
                      <td className="p-2 border">{p.H || 0}</td>
                      <td className="p-2 border">{p.ER || 0}</td>
                      <td className="p-2 border">{p.K || 0}</td>
                      <td className="p-2 border">{p.BB || 0}</td>
                      <td className="p-2 border">{p.QS || 0}</td>
                      <td className="p-2 border">{p.OUT || 0}</td>
                      <td className="p-2 border">{p.ERA || '0.00'}</td>
                      <td className="p-2 border">{p.WHIP || '0.00'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
