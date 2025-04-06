'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PlayerPage() {
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('Batter')
  const [range, setRange] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const dateRanges = {
    Today: () => {
      const today = new Date()
      return [today, today]
    },
    Yesterday: () => {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      return [y, y]
    },
    'Last 7 days': () => {
      const end = new Date()
      end.setDate(end.getDate() - 1)
      const start = new Date()
      start.setDate(end.getDate() - 6)
      return [start, end]
    },
    'Last 14 days': () => {
      const end = new Date()
      end.setDate(end.getDate() - 1)
      const start = new Date()
      start.setDate(end.getDate() - 13)
      return [start, end]
    },
    'Last 30 days': () => {
      const end = new Date()
      end.setDate(end.getDate() - 1)
      const start = new Date()
      start.setDate(end.getDate() - 29)
      return [start, end]
    },
    '2025 Season': () => {
      return [new Date('2025-03-28'), new Date('2025-11-30')]
    },
  }

  const formatISO = (d) => d.toISOString().split('T')[0]

  const handleRangeChange = (value) => {
    setRange(value)
    const [from, to] = dateRanges[value]()
    setFromDate(formatISO(from))
    setToDate(formatISO(to))
  }

  const fetchStatsAndStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/playerStatus'),
        fetch('/api/playerStats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: type.toLowerCase(), from: fromDate, to: toDate })
        })
      ])
      const [statusData, statsData] = await Promise.all([
        statusRes.json(),
        statsRes.ok ? statsRes.json() : Promise.resolve([])
      ])

      if (!Array.isArray(statusData)) throw new Error('狀態資料錯誤')

      const filteredStatus = statusData.filter(p => {
        if (type === 'Batter') return p.B_or_P === 'Batter'
        if (type === 'Pitcher') return p.B_or_P === 'Pitcher'
        return true
      })

      const merged = filteredStatus.map(p => {
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
    if (isNaN(d)) return ''
    return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
  }

  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">球員狀態與數據</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="flex gap-4 items-center mb-4 flex-wrap">
        <select value={type} onChange={e => setType(e.target.value)} className="border px-2 py-1 rounded">
          <option value="Batter">Batter</option>
          <option value="Pitcher">Pitcher</option>
        </select>
        <select value={range} onChange={e => handleRangeChange(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">選擇區間</option>
          {Object.keys(dateRanges).map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
        <Button onClick={fetchStatsAndStatus}>查詢</Button>
      </div>

      {loading && <div className="mb-4">讀取中...</div>}

      <Card>
        <CardContent className="overflow-auto p-4">
          <table className="text-xs w-full text-center border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">姓名</th>
                <th className="p-2 border">球隊</th>
                <th className="p-2 border">狀態</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={i}>
                  <td className="p-2 border">{p.Name}</td>
                  <td className="p-2 border">{p.Team}</td>
                  <td className="p-2 border">
                    {p.owner && p.owner !== '-' ? `On Team - ${p.owner}` :
                      p.status === 'Waiver' && p.offWaivers ? `off waivers ${formatDate(p.offWaivers)}` : p.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
