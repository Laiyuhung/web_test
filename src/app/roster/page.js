'use client'

import { useEffect, useState } from 'react'

export default function RosterPage() {
  const [players, setPlayers] = useState([])
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]
      setUserId(storedId || null)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, statsRes] = await Promise.all([
          fetch('/api/playerStatus'),
          fetch('/api/playerStats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'all', from: '2025-03-27', to: '2025-11-30' })
          })
        ])

        const [statusData, statsData] = await Promise.all([
          statusRes.json(),
          statsRes.ok ? statsRes.json() : []
        ])

        const merged = statusData.map(p => {
          const stat = statsData.find(s => s.name === p.Name)
          return {
            ...p,
            ...(stat || {})
          }
        })

        const myPlayers = merged.filter(p => p.manager_id?.toString() === userId)

        setPlayers(myPlayers)
      } catch (err) {
        console.error('讀取錯誤:', err)
      }
    }

    if (userId) fetchData()
  }, [userId])

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
      </>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">我的 ROSTER</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">打者 Batters</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-200">{renderHeader('Batter')}</thead>
            <tbody>
              {batters.map((p, i) => (
                <>{renderRow(p, 'Batter')}</>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">投手 Pitchers</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-200">{renderHeader('Pitcher')}</thead>
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