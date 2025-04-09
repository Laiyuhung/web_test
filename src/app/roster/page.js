'use client'

import { useEffect, useState } from 'react'

export default function RosterPage() {
  const [players, setPlayers] = useState([])
  const [userId, setUserId] = useState(null)
  const [range, setRange] = useState('Today')
  const [fromDate, setFromDate] = useState('2025-03-27')
  const [toDate, setToDate] = useState('2025-11-30')
  const [loading, setLoading] = useState(false)
  const [assignedPositions, setAssignedPositions] = useState({})


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
        const [statusRes, batterRes, pitcherRes, positionRes, registerRes] = await Promise.all([
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
            fetch('/api/playerPositionCaculate'),
            fetch('/api/playerRegisterStatus')
        ])

        const [statusData, batterData, pitcherData, positionData, registerData] = await Promise.all([
            statusRes.json(),
            batterRes.ok ? batterRes.json() : [],
            pitcherRes.ok ? pitcherRes.json() : [],
            positionRes.ok ? positionRes.json() : [],
            registerRes.ok ? registerRes.json() : []
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

        const myPlayers = merged.filter(p => p.manager_id?.toString() === userId)

        setPlayers(myPlayers)

        const defaultAssigned = {}
        myPlayers.forEach(p => {
          defaultAssigned[p.Name] = 'BN'
        })
        setAssignedPositions(defaultAssigned)

      } catch (err) {
        console.error('讀取錯誤:', err)
      }
      setLoading(false)
    }

    if (userId) fetchData()
  }, [userId, fromDate, toDate]) 

  
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

  const renderAssignedPositionSelect = (p) => {
    const isBatter = p.B_or_P === 'Batter';
    const options = [...(p.finalPosition || []), isBatter ? 'Util' : 'P', 'BN'];
  
    if (p.registerStatus === '一軍') {
      options.push('NA(備用)');
    } else {
      options.push('NA');
    }
  
    const currentValue = assignedPositions[p.Name] || 'BN';
  
    return (
      <div className="relative">
        <select
          value={currentValue}
          onChange={e => setAssignedPositions(prev => ({ ...prev, [p.Name]: e.target.value }))}
          className="appearance-none bg-[#0155A0] text-white text-xs font-bold w-8 h-8 rounded-full text-center leading-8 focus:outline-none"
          style={{ paddingLeft: '0.5rem' }}
        >
          {options.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>
    );
  }
  
  

  
  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  const renderCell = (val) => {
    const displayVal = (val ?? 0).toString()
    const isGray = displayVal === '0' || displayVal === '0.00' || displayVal === '.000'
    return (
      <td className={`p-2 font-bold whitespace-nowrap text-s ${isGray ? 'text-gray-400' : ''}`}>
        {displayVal}
      </td>
    )
  }
  
  

  const batters = players.filter(p => p.B_or_P === 'Batter')
  const pitchers = players.filter(p => p.B_or_P === 'Pitcher')

  const renderHeader = (type, zIndex = 'z-40') => {
    const labels = type === 'Batter'
      ? ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
      : ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
  
    return (
      <tr>
        {labels.map((label) => (
          <th
            key={label}
            className={`p-2 border font-bold bg-gray-200 sticky top-0 ${zIndex}`}
          >
            {label}
          </th>
        ))}
      </tr>
    )
  }
  

  const renderRow = (p, type) => {
    return (
      <>
        <tr>
          <td colSpan={type === 'Batter' ? 13 : 13} className="p-2 border text-left bg-white">
            
            <div className="flex items-center gap-1 font-bold text-[#0155A0] text-base">
              {renderAssignedPositionSelect(p)}
              <img
                src={`/photo/${p.Name}.png`}
                alt={p.Name}
                className="w-8 h-8 rounded-full"
                onError={(e) => e.target.src = '/photo/defaultPlayer.png'}
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
        <tr>
          {type === 'Batter' ? (
            <>
                {renderCell(p.AB)}
                {renderCell(p.R)}
                {renderCell(p.H)}
                {renderCell(p.HR)}
                {renderCell(p.RBI)}
                {renderCell(p.SB)}
                {renderCell(p.K)}
                {renderCell(p.BB)}
                {renderCell(p.GIDP)}
                {renderCell(p.XBH)}
                {renderCell(p.TB)}
                {renderCell(formatAvg(p.AVG))}
                {renderCell(formatAvg(p.OPS))}
            </>
          ) : (
            <>
                {renderCell(p.IP)}
                {renderCell(p.W)}
                {renderCell(p.L)}
                {renderCell(p.HLD)}
                {renderCell(p.SV)}
                {renderCell(p.H)}
                {renderCell(p.ER)}
                {renderCell(p.K)}
                {renderCell(p.BB)} 
                {renderCell(p.QS)}
                {renderCell(p.OUT)}
                {renderCell(p.ERA)}
                {renderCell(p.WHIP)}
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

      <div className="overflow-auto max-h-[600px]">
        <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Batters</h2>

            <table className="w-full text-sm text-center">
                <thead>{renderHeader('Batter', 'z-40')}</thead>
                <tbody>
                {batters.map((p, i) => (
                    <>{renderRow(p, 'Batter')}</>
                ))}
                </tbody>
            </table>

        </section>

        <section>
            <h2 className="text-lg font-semibold mb-2">Pitchers</h2>

            <table className="w-full text-sm text-center">
                <thead>{renderHeader('Pitcher', 'z-50')}</thead>
                <tbody>
                {pitchers.map((p, i) => (
                    <>{renderRow(p, 'Pitcher')}</>
                ))}
                </tbody>
            </table>

        </section>
      </div>
    </div>
  )
}