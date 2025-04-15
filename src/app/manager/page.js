'use client'

import { useEffect, useState } from 'react'

export default function ManagerPage() {
  const [players, setPlayers] = useState([])
  const [assignedPositions, setAssignedPositions] = useState({})
  const [selectedDate, setSelectedDate] = useState(() => {
    const nowUTC = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanDate = new Date(nowUTC.getTime() + taiwanOffset)
    return taiwanDate.toISOString().slice(0, 10)
  })
  const [selectedManager, setSelectedManager] = useState(1)
  const [managerNames, setManagerNames] = useState({})
  const [loading, setLoading] = useState(false)

  const batterPositionOrder = ['C', '1B', '2B', '3B', 'SS', 'OF', 'Util', 'BN', 'NA', 'NA(備用)']
  const pitcherPositionOrder = ['SP', 'RP', 'P', 'BN', 'NA', 'NA(備用)']

  useEffect(() => {
    const fetchManagers = async () => {
      const res = await fetch('/api/managers')
      const data = await res.json()
      const nameMap = {}
      data.forEach(m => nameMap[m.id] = m.team_name)
      setManagerNames(nameMap)
    }
    fetchManagers()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [statusRes, positionRes, registerRes] = await Promise.all([
          fetch('/api/playerStatus'),
          fetch('/api/playerPositionCaculate'),
          fetch('/api/playerRegisterStatus')
        ])

        const [statusData, positionData, registerData] = await Promise.all([
          statusRes.json(),
          positionRes.json(),
          registerRes.json()
        ])

        const merged = statusData.map(p => {
          const pos = positionData.find(pos => pos.name === p.Name)
          const finalPosition = pos?.finalPosition || []
          const reg = registerData.find(r => r.name === p.Name)
          const registerStatus = reg?.status || '未知'
          return {
            ...p,
            finalPosition,
            registerStatus
          }
        })

        const myPlayers = merged.filter(p => p.manager_id === selectedManager)
        setPlayers(myPlayers)

        await loadAssigned(myPlayers)
      } catch (err) {
        console.error('讀取錯誤:', err)
      }
      setLoading(false)
    }

    fetchData()
  }, [selectedManager, selectedDate])

  const loadAssigned = async (playersList) => {
    try {
      const res = await fetch(`/api/saveAssigned/load?date=${selectedDate}`)
      const data = await res.json()
      const map = {}
      playersList.forEach(p => {
        const record = data.find(r => r.player_name === p.Name)
        if (record) map[p.Name] = record.position
      })
      setAssignedPositions(map)
    } catch (err) {
      console.error('❌ 載入 AssignedPositions 失敗:', err)
    }
  }

  const formatDateToLabel = (isoDateStr) => {
    const [y, m, d] = isoDateStr.split('-').map(Number)
    const localDate = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00+08:00`)
    return localDate.toLocaleDateString('zh-TW', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const renderRow = (p) => {
    const position = assignedPositions[p.Name] || 'BN'
    return (
      <tr key={p.Name}>
        <td className="p-2 border text-center font-bold text-[#0155A0]">{position}</td>
        <td className="p-2 border text-left">{p.Name}</td>
        <td className="p-2 border text-left text-sm text-gray-500">{p.Team}</td>
      </tr>
    )
  }

  const batters = players.filter(p => p.B_or_P === 'Batter')
    .sort((a, b) => batterPositionOrder.indexOf(assignedPositions[a.Name] || 'BN') - batterPositionOrder.indexOf(assignedPositions[b.Name] || 'BN'))

  const pitchers = players.filter(p => p.B_or_P === 'Pitcher')
    .sort((a, b) => pitcherPositionOrder.indexOf(assignedPositions[a.Name] || 'BN') - pitcherPositionOrder.indexOf(assignedPositions[b.Name] || 'BN'))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">MANAGER 陣容總覽</h1>

      <div className="mb-4">
        <label className="text-sm font-semibold mr-2">選擇隊伍：</label>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(Number(e.target.value))}
          className="border px-2 py-1 rounded"
        >
          {[1, 2, 3, 4].map(id => (
            <option key={id} value={id}>{`#${id} ${managerNames[id] || ''}`}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-600 mb-2">日期：{formatDateToLabel(selectedDate)}</div>

      {loading && <div className="text-blue-500">Loading...</div>}

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Batters</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr>
              <th className="p-2 border">位置</th>
              <th className="p-2 border">姓名</th>
              <th className="p-2 border">球隊</th>
            </tr>
          </thead>
          <tbody>
            {batters.map(renderRow)}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Pitchers</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr>
              <th className="p-2 border">位置</th>
              <th className="p-2 border">姓名</th>
              <th className="p-2 border">球隊</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
