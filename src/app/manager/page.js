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
  const [batterSummary, setBatterSummary] = useState(null)
  const [pitcherSummary, setPitcherSummary] = useState(null)

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
        const [statusRes, positionRes, registerRes, batterRes, pitcherRes] = await Promise.all([
          fetch('/api/playerStatus'),
          fetch('/api/playerPositionCaculate'),
          fetch('/api/playerRegisterStatus'),
          fetch('/api/playerStats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'batter', from: selectedDate, to: selectedDate })
          }),
          fetch('/api/playerStats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'pitcher', from: selectedDate, to: selectedDate })
          })
        ])

        const [statusData, positionData, registerData, batterData, pitcherData] = await Promise.all([
          statusRes.json(),
          positionRes.json(),
          registerRes.json(),
          batterRes.json(),
          pitcherRes.json()
        ])

        const statsData = [...batterData, ...pitcherData]

        const merged = statusData.map(p => {
          const stat = statsData.find(s => s.name === p.Name)
          const pos = positionData.find(pos => pos.name === p.Name)
          const finalPosition = pos?.finalPosition || []
          const reg = registerData.find(r => r.name === p.Name)
          const registerStatus = reg?.status || '未知'
          return {
            ...p,
            ...(stat || {}),
            finalPosition,
            registerStatus
          }
        })

        const myPlayers = merged.filter(p => p.manager_id === selectedManager)
        setPlayers(myPlayers)
        await loadAssigned(myPlayers)

        // summary
        const batterNames = myPlayers.filter(p => p.B_or_P === 'Batter').map(p => p.Name)
        const pitcherNames = myPlayers.filter(p => p.B_or_P === 'Pitcher').map(p => p.Name)

        const [batterSumRes, pitcherSumRes] = await Promise.all([
          fetch('/api/playerStatsSummary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'batter', from: selectedDate, to: selectedDate, playerNames: batterNames })
          }),
          fetch('/api/playerStatsSummary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'pitcher', from: selectedDate, to: selectedDate, playerNames: pitcherNames })
          })
        ])

        setBatterSummary(await batterSumRes.json())
        setPitcherSummary(await pitcherSumRes.json())

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

  const renderCell = (val) => {
    const displayVal = (val ?? 0).toString()
    const isGray = displayVal === '0' || displayVal === '0.00' || displayVal === '.000'
    return <td className={`p-2 font-bold whitespace-nowrap text-s ${isGray ? 'text-gray-400' : ''}`}>{displayVal}</td>
  }

  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  const formatDecimal2 = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  const renderRow = (p, type) => (
    <>
      <tr>
        <td colSpan={type === 'Batter' ? 13 : 13} className={`p-2 border text-left ${['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name]) ? 'bg-gray-100' : 'bg-white'}`}>
          <div className="flex items-center gap-2 font-bold text-[#0155A0] text-base">
            <span className="text-sm min-w-[36px] text-center">{assignedPositions[p.Name] || 'BN'}</span>
            <img
              src={`/photo/${p.Name}.png`}
              alt={p.Name}
              className="w-8 h-8 rounded-full"
              onError={(e) => (e.target.src = '/photo/defaultPlayer.png')}
            />
            <span>{p.Name}</span>
            <span className="text-sm text-gray-500 ml-1">{p.Team} - {(p.finalPosition || []).join(', ')}</span>
            {['二軍', '未註冊', '註銷'].includes(p.registerStatus) && (
              <span className="ml-1 inline-block bg-[#FDEDEF] text-[#D10C28] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {p.registerStatus === '二軍' ? 'NA' : p.registerStatus}
              </span>
            )}
          </div>
        </td>
      </tr>
      <tr className={['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name]) ? 'bg-gray-100' : 'bg-white'}>
        {type === 'Batter' ? (
          <>
            {renderCell(p.AB)}{renderCell(p.R)}{renderCell(p.H)}{renderCell(p.HR)}{renderCell(p.RBI)}
            {renderCell(p.SB)}{renderCell(p.K)}{renderCell(p.BB)}{renderCell(p.GIDP)}{renderCell(p.XBH)}
            {renderCell(p.TB)}{renderCell(formatAvg(p.AVG))}{renderCell(formatAvg(p.OPS))}
          </>
        ) : (
          <>
            {renderCell(p.IP)}{renderCell(p.W)}{renderCell(p.L)}{renderCell(p.HLD)}{renderCell(p.SV)}
            {renderCell(p.H)}{renderCell(p.ER)}{renderCell(p.K)}{renderCell(p.BB)}{renderCell(p.QS)}
            {renderCell(p.OUT)}{renderCell(formatDecimal2(p.ERA))}{renderCell(formatDecimal2(p.WHIP))}
          </>
        )}
      </tr>
    </>
  )

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

      <div className="text-sm text-gray-600 mb-2">日期：{selectedDate}</div>
      {loading && <div className="text-blue-500">Loading...</div>}

      {batterSummary && (
        <div className="mb-6">
          <h3 className="font-semibold text-[13px] text-[#0155A0] mb-1">Batters Total</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[900px] grid grid-cols-13 gap-x-1 px-1">
              {['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map(label => (
                <div key={label} className="text-[11px] text-gray-500 font-medium text-center">{label}</div>
              ))}
              {['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map(key => (
                <div key={key} className="text-center text-[#0155A0] font-bold">{batterSummary[key]}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Batters</h2>
        <table className="w-full text-sm text-center">
          <thead>
            <tr>
              {['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map(label => (
                <th key={label} className="p-2 border bg-gray-100">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batters.map(p => renderRow(p, 'Batter'))}
          </tbody>
        </table>
      </div>

      {pitcherSummary && (
        <div className="mt-6">
          <h3 className="font-semibold text-[13px] text-[#0155A0] mb-1">Pitchers Total</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[900px] grid grid-cols-13 gap-x-1 px-1">
              {['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map(label => (
                <div key={label} className="text-[11px] text-gray-500 font-medium text-center">{label}</div>
              ))}
              {['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map(key => (
                <div key={key} className="text-center text-[#0155A0] font-bold">{pitcherSummary[key]}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Pitchers</h2>
        <table className="w-full text-sm text-center">
          <thead>
            <tr>
              {['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map(label => (
                <th key={label} className="p-2 border bg-gray-100">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pitchers.map(p => renderRow(p, 'Pitcher'))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
