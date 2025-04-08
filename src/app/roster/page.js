'use client'

import { useEffect, useState } from 'react'

export default function RosterPage() {
  const [players, setPlayers] = useState([])
  const [userId, setUserId] = useState(null)
  const [range, setRange] = useState('Today')
  const [fromDate, setFromDate] = useState('2025-03-27')
  const [toDate, setToDate] = useState('2025-11-30')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]
      setUserId(storedId || null)
    }
  }, [])

  useEffect(() => {
    applyDateRange(range)
  }, [range])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [statusRes, batterRes, pitcherRes, positionRes] = await Promise.all([
            fetch('/api/playerStatus'),
            fetch('/api/playerStats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'batter', from: fromDate, to: toDate })
            }),
            fetch('/api/playerStats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'pitcher', from: fromDate, to: toDate })
            }),
            fetch('/api/playerPositionCaculate')
        ])

        const [statusData, batterData, pitcherData, positionData] = await Promise.all([
            statusRes.json(),
            batterRes.ok ? batterRes.json() : [],
            pitcherRes.ok ? pitcherRes.json() : [],
            positionRes.ok ? positionRes.json() : []
        ])

        
        const statsData = [...batterData, ...pitcherData]

        const merged = statusData.map(p => {
          const stat = statsData.find(s => s.name === p.Name)
          const pos = positionData.find(pos => pos.name === p.Name)
          const finalPosition = pos?.finalPosition || []
          return {
            ...p,
            ...(stat || {}),
            finalPosition
          }
        })

        const myPlayers = merged.filter(p => p.manager_id?.toString() === userId)

        setPlayers(myPlayers)
      } catch (err) {
        console.error('讀取錯誤:', err)
      }
      setLoading(false)
    }

    if (userId) fetchData()
  }, [userId])

  const today = new Date()
    
  const formatDateInput = (date) => date.toISOString().slice(0, 10)

    
  const applyDateRange = (range) => {
  const d = new Date(today)
  let from = '', to = ''
  switch (range) {
      case 'Today':
      from = to = formatDateInput(d)
      break
      case 'Yesterday':
      d.setDate(d.getDate() - 1)
      from = to = formatDateInput(d)
      break
      case 'Last 7 days':
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 7)
      const yest7 = new Date(today)
      yest7.setDate(yest7.getDate() - 1)
      from = formatDateInput(last7)
      to = formatDateInput(yest7)
      break
      case 'Last 14 days':
      const last14 = new Date(today)
      last14.setDate(last14.getDate() - 14)
      const yest14 = new Date(today)
      yest14.setDate(yest14.getDate() - 1)
      from = formatDateInput(last14)
      to = formatDateInput(yest14)
      break
      case 'Last 30 days':
      const last30 = new Date(today)
      last30.setDate(last30.getDate() - 30)
      const yest30 = new Date(today)
      yest30.setDate(yest30.getDate() - 1)
      from = formatDateInput(last30)
      to = formatDateInput(yest30)
      break
      case '2025 Season':
      default:
      from = '2025-03-27'
      to = '2025-11-30'
      break
  }
  setFromDate(from)
  setToDate(to)
  }


  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  const batters = players.filter(p => p.B_or_P === 'Batter')
  const pitchers = players.filter(p => p.B_or_P === 'Pitcher')

  const renderHeader = (type) => {
    return (
      <tr>
        {type === 'Batter' ? (
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
    )
  }

  const renderRow = (p, type) => {
    return (
      <>
        <tr>
          <td colSpan={type === 'Batter' ? 13 : 13} className="p-2 border text-left bg-white">
            <div className="flex items-center gap-1 font-bold text-[#0155A0] text-base">
              <img
                src={`/photo/${p.Name}.png`}
                alt={p.Name}
                className="w-8 h-8 rounded-full"
                onError={(e) => e.target.src = '/photo/defaultPlayer.png'}
              />
              <span>{p.Name}</span>
              <span className="text-sm text-gray-500 ml-1">{p.Team} - {(p.finalPosition || []).join(', ')}</span>
            </div>
          </td>
        </tr>
        <tr>
          {type === 'Batter' ? (
            <>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.AB || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.R || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.H || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.HR || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.RBI || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.SB || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.K || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.BB || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.GIDP || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.XBH || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.TB || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{formatAvg(p.AVG)}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{formatAvg(p.OPS)}</td>
            </>
          ) : (
            <>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.IP || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.W || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.L || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.HLD || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.SV || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.H || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.ER || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.K || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.BB || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.QS || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.OUT || 0}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.ERA || '0.00'}</td>
              <td className="p-2 font-bold whitespace-nowrap text-s">{p.WHIP || '0.00'}</td>
            </>
          )}
        </tr>
      </>
    )
  }

  return (


    
      <div className="p-6">

      <div className="mb-4">
      <label className="text-sm font-semibold">Stats Range</label>
      <select
          value={range}
          onChange={e => setRange(e.target.value)}
          className="border px-2 py-1 rounded ml-2"
      >
          <option>Today</option>
          <option>Yesterday</option>
          <option>Last 7 days</option>
          <option>Last 14 days</option>
          <option>Last 30 days</option>
          <option>2025 Season</option>
      </select>
      </div>
      
      {loading && <div className="mb-4 text-blue-600 font-semibold">Loading...</div>}
      <h1 className="text-xl font-bold mb-6">MY ROSTER</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Batters</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-200 sticky top-0 z-10">{renderHeader('Batter')}</thead>
            <tbody>
              {batters.map((p, i) => (
                <>{renderRow(p, 'Batter')}</>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Pitchers</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-200 sticky top-0 z-20">{renderHeader('Pitcher')}</thead>
            <tbody>
              {pitchers.map((p, i) => (
                <>{renderRow(p, 'Pitcher')}</>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}