'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function RosterPage() {
  const [players, setPlayers] = useState([])
  const [assignedPositions, setAssignedPositions] = useState({})
  const [userId, setUserId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const nowUTC = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanDate = new Date(nowUTC.getTime() + taiwanOffset)
    return taiwanDate.toISOString().slice(0, 10)
  })
  const [rosterReady, setRosterReady] = useState(false)

  const batterPositionOrder = ['C', '1B', '2B', '3B', 'SS', 'OF', 'Util', 'BN', 'NA', 'NA(備用)']
  const pitcherPositionOrder = ['SP', 'RP', 'P', 'BN', 'NA', 'NA(備用)']

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]
      setUserId(storedId || null)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      if (!userId || !selectedDate) return

      try {
        const res = await fetch(`/api/saveAssigned/loadForRoster?date=${selectedDate}&manager_id=${userId}`)
        const data = await res.json()

        const map = {}
        const list = data.map(row => {
          map[row.player_name] = row.position
          return {
            Name: row.player_name,
            Team: row.team || '',
            B_or_P: row.type || '',
            finalPosition: row.finalPosition || [],
            registerStatus: row.registerStatus || '未知',
            identity: row.identity || '',
            ...row.stats
          }
        })

        setAssignedPositions(map)
        setPlayers(list)
        setRosterReady(true)
      } catch (err) {
        console.error('❌ 載入資料失敗:', err)
      }
    }

    loadData()
  }, [userId, selectedDate])

  const batters = players
    .filter(p => p.B_or_P === 'Batter' && assignedPositions[p.Name] !== undefined)
    .sort((a, b) => {
      const posA = assignedPositions[a.Name] || 'BN'
      const posB = assignedPositions[b.Name] || 'BN'
      return batterPositionOrder.indexOf(posA) - batterPositionOrder.indexOf(posB)
    })

  const pitchers = players
    .filter(p => p.B_or_P === 'Pitcher' && assignedPositions[p.Name] !== undefined)
    .sort((a, b) => {
      const posA = assignedPositions[a.Name] || 'BN'
      const posB = assignedPositions[b.Name] || 'BN'
      return pitcherPositionOrder.indexOf(posA) - pitcherPositionOrder.indexOf(posB)
    })

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            const prev = new Date(selectedDate)
            prev.setDate(prev.getDate() - 1)
            setRosterReady(false)
            setSelectedDate(prev.toISOString().slice(0, 10))
          }}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="text-lg font-bold text-gray-800">
          {selectedDate}
        </span>

        <button
          onClick={() => {
            const next = new Date(selectedDate)
            next.setDate(next.getDate() + 1)
            setRosterReady(false)
            setSelectedDate(next.toISOString().slice(0, 10))
          }}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {rosterReady && (
        <>
          <h1 className="text-xl font-bold mb-4">MY ROSTER</h1>
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Batters</h2>
            <ul className="list-disc ml-6 space-y-1">
              {batters.map(p => (
                <li key={p.Name}>{p.Name} - {assignedPositions[p.Name]}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-2">Pitchers</h2>
            <ul className="list-disc ml-6 space-y-1">
              {pitchers.map(p => (
                <li key={p.Name}>{p.Name} - {assignedPositions[p.Name]}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
