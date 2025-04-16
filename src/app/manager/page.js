'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function RosterPage() {
  const [selectedManager, setSelectedManager] = useState(null)
  const [managers, setManagers] = useState([])
  const [weeklyIP, setWeeklyIP] = useState('0.0')
  const [activeCount, setActiveCount] = useState(0)
  const [weeklyAddCount, setWeeklyAddCount] = useState(0)
  const [gameInfoMap, setGameInfoMap] = useState({})
  const [players, setPlayers] = useState([])
  const [userId, setUserId] = useState(null)
  const [range, setRange] = useState('Today')
  const [fromDate, setFromDate] = useState('2025-03-27')
  const [toDate, setToDate] = useState('2025-11-30')
  const [loading, setLoading] = useState(false)
  const [assignedPositions, setAssignedPositions] = useState({})
  const [moveTarget, setMoveTarget] = useState(null) // 被點的球員
  const [moveSlots, setMoveSlots] = useState(null)   // 該球員可選 slot 狀態
  const batterPositionOrder = ['C', '1B', '2B', '3B', 'SS', 'OF', 'Util', 'BN', 'NA', 'NA(備用)']
  const pitcherPositionOrder = ['SP', 'RP', 'P', 'BN', 'NA', 'NA(備用)']
  const [moveMessage, setMoveMessage] = useState('')
  const [positionsLoaded, setPositionsLoaded] = useState(false)
  const [rosterReady, setRosterReady] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [batterSummary, setBatterSummary] = useState(null)
  const [pitcherSummary, setPitcherSummary] = useState(null)
  const [gameInfoLoaded, setGameInfoLoaded] = useState(false)
  const [startingPitchers, setStartingPitchers] = useState([])
  const [pitchersLoaded, setPitchersLoaded] = useState(false)
  const [startingLineup, setStartingLineup] = useState([])
  const [lineupTeams, setLineupTeams] = useState([])
  const [foreignCount, setForeignCount] = useState({ all: 0, active: 0 })
  const [selectedDate, setSelectedDate] = useState(() => {
    const nowUTC = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000 // +08:00 offset in milliseconds
    const taiwanDate = new Date(nowUTC.getTime() + taiwanOffset)
    return taiwanDate.toISOString().slice(0, 10)
  })

  useEffect(() => {
    const fetchManagers = async () => {
      const res = await fetch('/api/managers')
      const data = await res.json()
      if (res.ok) setManagers(data)
      else console.error('❌ 無法取得 managers 名單:', data)
    }
  
    fetchManagers()
  }, [])
  

  useEffect(() => {
    if (!selectedManager) return
  
    const fetchWeeklyIP = async () => {
      try {
        const res = await fetch('/api/weekly_ip_by_manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manager_id: parseInt(selectedManager) })
        })
        const data = await res.json()
        if (res.ok) {
          setWeeklyIP(data.IP || '0.0')
        } else {
          console.error('❌ weekly_ip 查詢失敗:', data)
          setWeeklyIP(null)
        }
      } catch (err) {
        console.error('❌ 呼叫 weekly_ip_by_manager 失敗:', err)
        setWeeklyIP(null)
      }
    }
  
    fetchWeeklyIP()
  }, [selectedManager])

  useEffect(() => {
    if (!selectedManager) return
  
    const fetchWeeklyAddCount = async () => {
      try {
        const res = await fetch('/api/transaction/weekly_add_count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manager_id: selectedManager })
        })
  
        const data = await res.json()
        if (res.ok) {
          setWeeklyAddCount(data.count)
        } else {
          console.error('⚠️ 查詢失敗:', data)
          setWeeklyAddCount(null)
        }
      } catch (err) {
        console.error('❌ 呼叫 weekly_add_count 失敗:', err)
        setWeeklyAddCount(null)
      }
    }
  
    fetchWeeklyAddCount()
  }, [selectedManager])
  
  
  useEffect(() => {
    const fetchLineupTeams = async () => {
      try {
        const res = await fetch(`/api/starting-lineup/teams?date=${selectedDate}`)
        const data = await res.json()
        if (res.ok) {
          setLineupTeams(data)
          console.log('📋 已登錄打序的球隊:', data)
        } else {
          console.error('❌ 取得 lineup 球隊失敗:', data)
          setLineupTeams([])
        }
      } catch (err) {
        console.error('❌ 無法取得 starting-lineup/teams:', err)
        setLineupTeams([])
      }
    }
  
    fetchLineupTeams()
  }, [selectedDate])

  useEffect(() => {
    const fetchStartingLineup = async () => {
      try {
        const res = await fetch(`/api/starting-lineup/load?date=${selectedDate}`)
        const data = await res.json()
        if (res.ok) {
          setStartingLineup(data) // ← 儲存整包打序資料
        } else {
          console.error('❌ 取得先發打序失敗:', data)
          setStartingLineup([])
        }
      } catch (err) {
        console.error('❌ 無法取得 starting_lineup:', err)
        setStartingLineup([])
      }
    }
  
    fetchStartingLineup()
  }, [selectedDate])

  useEffect(() => {
    const fetchStartingPitchers = async () => {
      try {
        const res = await fetch(`/api/starting-pitcher/load?date=${selectedDate}`)
        const data = await res.json()
        if (res.ok) {
          setStartingPitchers(data)
        } else {
          console.error('❌ 取得先發名單失敗:', data)
          setStartingPitchers([])
        }
      } catch (err) {
        console.error('❌ 無法取得 starting_pitcher:', err)
        setStartingPitchers([])
      }
      setPitchersLoaded(true)
    }
  
    setPitchersLoaded(false)
    fetchStartingPitchers()
  }, [selectedDate])
  

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
    if (rosterReady) {
      fetchStatsSummary()
    }
  }, [rosterReady])

  useEffect(() => {
    if (rosterReady) {
      console.log('📊 觸發 fetchStatsSummary (roster ready & date):', selectedDate)
      fetchStatsSummary()
    }
  }, [rosterReady, selectedDate])
  
  useEffect(() => {
    if (selectedManager) {
      console.log('🔍 選擇的 manager:', selectedManager)
      console.log('📅 選擇的日期:', selectedDate)
    }
  }, [selectedManager, selectedDate])

  useEffect(() => {
    if (range === 'Today') {
      applyDateRange('Today')
    }
  }, [selectedDate])

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

        const myPlayers = merged.filter(p => p.manager_id?.toString() === selectedManager)
        console.log('👥 撈到的 myPlayers:', myPlayers) // 👈 加這行

        setPlayers(myPlayers)

        await loadAssigned(myPlayers)
        setPositionsLoaded(true)
        setRosterReady(true)

      } catch (err) {
        console.error('讀取錯誤:', err)
      }
      setLoading(false)
    }

    if (selectedManager) fetchData()
  }, [selectedManager, fromDate, toDate]) 

  useEffect(() => {
    const allForeign = players.filter(p => p.identity === '洋將')
    const activeForeign = allForeign.filter(p => !['NA', 'NA(備用)'].includes(assignedPositions[p.Name]))
  
    setForeignCount({
      all: allForeign.length,
      active: activeForeign.length
    })

    // ✅ 加在這裡！
    const activePlayers = players.filter(p => !['NA', 'NA(備用)'].includes(assignedPositions[p.Name]))
    setActiveCount(activePlayers.length)

  }, [players, assignedPositions])
  

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const map = {}
        const teams = [...new Set(players.map(p => p.Team))]
  
        for (const team of teams) {
          const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate, team })
          })
          const data = await res.json()
  
          if (data?.info) {
            map[team] = data.info
          } else {
            map[team] = 'No game'
          }
        }
  
        setGameInfoMap(map)
        setGameInfoLoaded(true)
      } catch (err) {
        console.error('❌ 賽程讀取失敗:', err)
        setGameInfoMap({})
      }
    }
    
    setGameInfoLoaded(false)
    if (players.length > 0) {
      fetchGames()
    }
  }, [selectedDate, players])
  

  const fetchStatsSummary = async () => {
    const batterNames = players
      .filter(p => p.B_or_P === 'Batter' && !['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name]))
      .map(p => p.Name)

    const pitcherNames = players
      .filter(p => p.B_or_P === 'Pitcher' && !['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name]))
      .map(p => p.Name)
  
    try {
      const [batterRes, pitcherRes] = await Promise.all([
        fetch('/api/playerStatsSummary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'batter',
            from: selectedDate,
            to: selectedDate,
            playerNames: batterNames,
          })
        }),
        fetch('/api/playerStatsSummary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pitcher',
            from: selectedDate,
            to: selectedDate,
            playerNames: pitcherNames,
          })
        })
      ])
  
      const batter = await batterRes.json()
      const pitcher = await pitcherRes.json()
  
      setBatterSummary(batter)
      setPitcherSummary(pitcher)
    } catch (err) {
      console.error('❌ 加總 stats summary 錯誤:', err)
    }
  }
 
  const formatDateInput = (date) => date.toISOString().slice(0, 10)

    
  const applyDateRange = (range) => {
    const now = new Date()  // ⚠️ 改這裡，保證每次呼叫都抓系統當前時間
    let from = '', to = ''
  
    switch (range) {
      case 'Today':
        from = to = selectedDate  // ✅ 唯一使用 selectedDate 的情況
        break
      case 'Yesterday':
        now.setDate(now.getDate() - 1)
        from = to = formatDateInput(now)
        break
      case 'Last 7 days':
        const last7 = new Date(now)
        last7.setDate(now.getDate() - 7)
        const yest7 = new Date(now)
        yest7.setDate(now.getDate() - 1)
        from = formatDateInput(last7)
        to = formatDateInput(yest7)
        break
      // ⬇️ 同理處理 Last 14, 30 ...
      case 'Last 14 days':
        const last14 = new Date(now)
        last14.setDate(now.getDate() - 14)
        const yest14 = new Date(now)
        yest14.setDate(now.getDate() - 1)
        from = formatDateInput(last14)
        to = formatDateInput(yest14)
        break
      case 'Last 30 days':
        const last30 = new Date(now)
        last30.setDate(now.getDate() - 30)
        const yest30 = new Date(now)
        yest30.setDate(now.getDate() - 1)
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
    const currentValue = assignedPositions[p.Name] || 'BN'
    return (
      <span className="text-[#004AAD] text-sm font-bold min-w-[36px] text-center">
        {currentValue}
      </span>
    )
  }
  
  
  
  const openMoveModal = (player) => {
    console.log('🔁 可選位置:', player.finalPosition)
  
    const baseSlots = [...(player.finalPosition || []), player.B_or_P === 'Batter' ? 'Util' : 'P', 'BN']
    const naSlots = player.registerStatus === '一軍' ? ['NA(備用)'] : ['NA', 'NA(備用)']
    const allSlots = [...baseSlots, ...naSlots]
  
    const slotLimit = {
      'C': 1,
      '1B': 1,
      '2B': 1,
      '3B': 1,
      'SS': 1,
      'OF': 3,
      'Util': 2,
      'SP': 5,
      'RP': 5,
      'P': 3,
      'BN': 99,
      'NA': 5, // 統一限制 NA 類位置
    }
  
    const slotStatus = {}
  
    allSlots.forEach(pos => {
      // 處理 NA 與 NA(備用) 為同一組
      if (pos === 'NA' || pos === 'NA(備用)') {
        const assignedNA = players.filter(p => assignedPositions[p.Name] === 'NA')
        const assignedBackup = players.filter(p => assignedPositions[p.Name] === 'NA(備用)')
        const totalCount = assignedNA.length + assignedBackup.length
        const max = slotLimit['NA'] // 限制總共 5 人
      
        if (pos === 'NA' && !slotStatus['NA']) {
          slotStatus['NA'] = {
            displayAs: 'NA',
            count: totalCount,
            max,
            players: assignedNA
          }
        }
      
        if (pos === 'NA(備用)' && !slotStatus['NA(備用)']) {
          slotStatus['NA(備用)'] = {
            displayAs: 'NA(備用)',
            count: totalCount,
            max,
            players: assignedBackup
          }
        }
      } else {
        const assigned = players.filter(p => assignedPositions[p.Name] === pos)
        slotStatus[pos] = {
          displayAs: pos,
          count: assigned.length,
          max: slotLimit[pos] || 99,
          players: assigned
        }
      }
    })
  
    console.log('🧩 各位置狀況:', slotStatus)

    setMoveTarget(player)
    setMoveSlots(slotStatus)
  
    // TODO: 打開一個 modal，傳入 slotStatus 跟 player 本身
  }
  

  const loadAssigned = async (playersList) => {
    console.log('📦 載入 assigned，用的 playersList:', playersList)
  
    try {
      const res = await fetch(`/api/saveAssigned/load_manager?date=${selectedDate}&manager_id=${selectedManager}`)
      const data = await res.json()
      console.log('👀 回傳資料內容:', data) // 👈 加這行
      if (!res.ok) throw new Error(data.error || '讀取失敗')
  
      const map = {}
      playersList.forEach(p => {
        const record = data.find(r => r.player_name === p.Name)
        if (record) {
          map[p.Name] = record.position
        }
      })
  
      console.log('📋 載入完成的球員位置對應:', map) // 👈 加這行
  
      setAssignedPositions(map)
    } catch (err) {
      console.error('❌ 載入 AssignedPositions 失敗:', err)
    }
  }

  // ✅ 加入這段：
  const saveAssigned = async (updatedMap) => {
    try {
      const res = await fetch('/api/saveAssigned/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedPositions: updatedMap,
          startDate: selectedDate  // 👈 把目前畫面日期當作開始日傳給後端
        }),
      })
  
      let data = {}
      try {
        data = await res.json()  // 👈 包起來避免 json() 本身錯誤
      } catch (jsonErr) {
        throw new Error('無法解析後端回應')
      }
  
      if (!res.ok) {
        console.error('❌ 儲存 API 錯誤:', data)
        throw new Error(data.error || '儲存失敗')
      }
  
      console.log('✅ 儲存成功:', data)
      setMoveMessage('✅ 自動儲存成功')
      setTimeout(() => setMoveMessage(''), 2000)
  
      await loadAssigned(players)
    } catch (err) {
      console.error('❌ 自動儲存錯誤:', err.message)
      setMoveMessage('❌ 自動儲存失敗，請稍後再試')
      setTimeout(() => setMoveMessage(''), 3000)
    }
  }


  const formatDateToLabel = (isoDateStr) => {
  const [y, m, d] = isoDateStr.split('-').map(Number)
  const localDate = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00+08:00`)
  
  const weekday = localDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Taipei' })
  const month = localDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Taipei' })
  const day = localDate.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Taipei' })

  return `${weekday}, ${month} ${day}`
}
  
  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  const formatDecimal2 = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '0.00' : num.toFixed(2)
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
          <td
            colSpan={type === 'Batter' ? 13 : 13}
            className={`p-2 border text-left ${
              ['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name]) ? 'bg-gray-100' : 'bg-white'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-[#0155A0] text-base">
              {renderAssignedPositionSelect(p)}
              <img
                src={`/photo/${p.Name}.png`}
                alt={p.Name}
                className="w-8 h-8 rounded-full"
                onError={(e) => (e.target.src = '/photo/defaultPlayer.png')}
              />
              <div className="flex flex-col">
                {/* 第一行：名字 + Team + Position */}
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#0155A0]">{p.Name}</span>
                  <span className="text-sm text-gray-500">{p.Team}</span>
                  <span className="text-sm text-gray-500">- {(p.finalPosition || []).join(', ')}</span>
                </div>

                {/* 第二行：比賽資訊 + 打序 or 先發標記 */}
                <div className="flex items-center justify-start gap-2">
                  <span className="text-sm text-gray-500">
                    {gameInfoMap[p.Team] ?? 'No game'}
                  </span>

                  {/* 顯示打序號 or X or V */}
                  {(() => {
                    const found = startingLineup.find(l => l.name === p.Name)

                    // 先發打序：顯示號碼（深綠底）
                    if (found) {
                      return (
                        <span className="text-white bg-green-700 text-xs font-bold px-2 py-0.5 rounded">
                          {found.batting_no}
                        </span>
                      )
                    }

                    // 沒找到打序，若為 Pitcher 不顯示 X
                    if (p.B_or_P === 'Pitcher') return null

                    // 隊伍有登錄但沒該球員 → 紅底 X
                    if (lineupTeams.includes(p.Team)) {
                      return (
                        <span className="text-white bg-red-600 text-xs font-bold px-2 py-0.5 rounded">
                          X
                        </span>
                      )
                    }

                    // 沒有打比賽也沒登錄 → 不顯示
                    return null
                  })()}

                  {/* 若為投手先發 → 顯示 V */}
                  {startingPitchers.some(sp => sp.name === p.Name) && (
                    <span className="text-white bg-green-700 text-xs font-bold px-2 py-0.5 rounded">
                      V
                    </span>
                  )}
                </div>

              </div>

              {['二軍', '未註冊', '註銷'].includes(p.registerStatus) && (
                <span className="ml-1 inline-block bg-[#FDEDEF] text-[#D10C28] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {p.registerStatus === '二軍' ? 'NA' : p.registerStatus}
                </span>
              )}
            </div>
          </td>
        </tr>

        <tr
          className={
            ['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name])
              ? 'bg-gray-100'
              : 'bg-white'
          }
        >
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
                {renderCell(formatDecimal2(p.ERA))}
                {renderCell(formatDecimal2(p.WHIP))}

            </>
          )}
        </tr>
      </>
    )
  }

  return (
    
      <div className="p-6">

      {moveMessage && (
        <div className="mb-4 p-3 text-sm bg-blue-50 text-blue-800 border border-blue-300 rounded">
          {moveMessage}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 mb-4">
        {/* 日期左右按鈕＋顯示文字 */}
        <div className="flex items-center gap-4">
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

          {/* 可點擊的日期文字 */}
          <button
            onClick={() => setShowDatePicker(prev => !prev)}
            className="text-lg font-bold text-gray-800 hover:underline"
          >
            {formatDateToLabel(selectedDate)}
          </button>

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

        {/* 黑底白字的 Today 按鈕 */}
        <button
          onClick={() => {
            const now = new Date()
            const taiwanOffset = 8 * 60 * 60 * 1000
            const taiwanTime = new Date(now.getTime() + taiwanOffset)
            const date = taiwanTime.toISOString().slice(0, 10)
            setSelectedDate(date)
            setShowDatePicker(false)
          }}
          className="px-4 py-1 rounded bg-black text-white text-sm hover:opacity-90"
        >
          Today
        </button>

        {/* 日期選擇器，點日期文字時才出現 */}
        {showDatePicker && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setShowDatePicker(false)
            }}
            min="2025-03-27"
            max="2025-11-30"
            className="text-sm border px-2 py-1 rounded"
          />
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
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
        <div className="mb-4">
          <label className="text-sm font-semibold">Manager</label>
          <select
            value={selectedManager || ''}
            onChange={(e) => {
              setSelectedManager(e.target.value)
            }}
            className="ml-2 border px-2 py-1 rounded"
          >
            <option value="">選擇玩家</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.team_name}</option>
            ))}
          </select>
        </div>


        <div className="text-sm text-right font-medium text-gray-700 leading-snug">
          <div>
            <span className="text-[#0155A0]">Active Roster：</span>
            <span className="text-[#0155A0]">{activeCount}</span>
          </div>
          <div>
            <span className="text-[#0155A0]">On team 洋將：</span>
            <span className="text-[#0155A0]">{foreignCount.all}</span>
          </div>
          <div>
            <span className="text-[#0155A0]">Active 洋將：</span>
            <span className="text-[#0155A0]">{foreignCount.active}</span>
          </div>
          <div>
            <span className="text-[#0155A0]">Weekly Adds：</span>
            <span className="text-[#0155A0]">{weeklyAddCount}</span>
          </div>
          <div>
            <span className="text-[#0155A0]">Weekly IP：</span>
            <span className={parseFloat(weeklyIP) < 30 ? 'text-red-600 font-bold' : 'text-[#0155A0]'}>
              {weeklyIP ?? '-'}
            </span>
          </div>


        </div>
      </div>
      
      {loading && <div className="mb-4 text-blue-600 font-semibold">Loading...</div>}
      <h1 className="text-xl font-bold mb-6">MANAGER LINEUP</h1>
      
      {batterSummary && pitcherSummary && (
        <div className="mb-6 space-y-6 text-sm text-gray-600">
          
          {/* 🟦 Batters Summary */}
          <div>
            <h3 className="font-semibold text-[13px] text-[#0155A0] mb-1">Batters Total</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-13 gap-x-1 px-1">
                {['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map((label, i) => (
                  <div key={i} className="text-[11px] text-gray-500 font-medium text-center">{label}</div>
                ))}
                {['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map((key, i) => (
                  <div key={i} className="text-center text-[#0155A0] font-bold">{batterSummary[key]}</div>
                ))}
              </div>
            </div>
          </div>

          {/* 🟦 Pitchers Summary */}
          <div>
            <h3 className="font-semibold text-[13px] text-[#0155A0] mb-1">Pitchers Total</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-13 gap-x-1 px-1">
                {['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map((label, i) => (
                  <div key={i} className="text-[11px] text-gray-500 font-medium text-center">{label}</div>
                ))}
                {['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map((key, i) => (
                  <div key={i} className="text-center text-[#0155A0] font-bold">{pitcherSummary[key]}</div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {positionsLoaded && !gameInfoLoaded && (
        <div className="text-sm text-gray-500 mb-4">陣容及賽程載入中...</div>
      )}

      {positionsLoaded && gameInfoLoaded && (
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
      )}

      {moveTarget && moveSlots && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] max-w-xl rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Move Player</h2>
              <button
                onClick={() => {
                  setMoveTarget(null)
                  setMoveSlots(null)
                }}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Select a new position for <strong>{moveTarget.Name}</strong>
            </p>

            {Object.entries(moveSlots)
              .filter(([posKey]) => posKey !== assignedPositions[moveTarget.Name]) // ❌ 不顯示目前位置
              .map(([posKey, slot]) => (
              <div key={posKey} className="mb-4">
                <h3 className="font-semibold text-sm mb-1">{slot.displayAs}</h3>
                <div className="space-y-1">
                {slot.players.map(p => (
                  <button
                    key={p.Name}
                    onClick={() => {
                      const getGameDateTime = (team) => {
                        const info = gameInfoMap[team]
                        const timeMatch = info?.match(/\d{2}:\d{2}/)
                        const timeStr = timeMatch ? timeMatch[0] : '23:59'
                        return new Date(`${selectedDate}T${timeStr}:00+08:00`)
                      }
                    
                      const now = new Date()
                      const taiwanNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
                    
                      const moveGameTime = getGameDateTime(moveTarget.Team)
                      const targetGameTime = getGameDateTime(p.Team)
                    
                      const moveLocked = taiwanNow >= moveGameTime
                      const targetLocked = taiwanNow >= targetGameTime
                    
                      console.log('🕒 台灣時間:', taiwanNow.toISOString())
                      console.log(`🔒 ${moveTarget.Team} 鎖定狀態:`, moveLocked, moveGameTime.toISOString())
                      console.log(`🔒 ${p.Team} 鎖定狀態:`, targetLocked, targetGameTime.toISOString())
                    
                      if (moveLocked || targetLocked) {
                        setMoveMessage(`❌ ${moveTarget.Team} 或 ${p.Team} 比賽已開始，禁止異動位置`)
                        setTimeout(() => setMoveMessage(''), 3000)
                        return
                      }
                    
                      // ✅ 原本交換邏輯
                      const currentPos = assignedPositions[moveTarget.Name]
                      const canReturn = (p.finalPosition || []).includes(currentPos) ||
                                        (p.B_or_P === 'Batter' && currentPos === 'Util') ||
                                        (p.B_or_P === 'Pitcher' && currentPos === 'P') ||
                                        currentPos === 'BN' ||
                                        currentPos === 'NA' || currentPos === 'NA(備用)'
                    
                      const fallback = 'BN'
                      const newPos = canReturn ? currentPos : fallback
                    
                      setMoveTarget(null)
                      setMoveSlots(null)
                    
                      setAssignedPositions(prev => {
                        const updated = { ...prev }
                        updated[moveTarget.Name] = posKey
                        updated[p.Name] = newPos
                        saveAssigned(updated)
                        return updated
                      })
                    
                      setMoveMessage(`${moveTarget.Name} 被移動到 ${posKey}，${p.Name} 被移動到 ${newPos}`)
                      setTimeout(() => setMoveMessage(''), 3000)
                    }}
                    
                    
                    
                    className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={`/photo/${p.Name}.png`}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => (e.target.src = '/photo/defaultPlayer.png')}
                      />
                      <span className="text-sm font-medium">{p.Name}</span>
                      <span className="text-xs text-gray-400">{p.Team}</span>
                    </div>
                    <span className="text-blue-500">↔</span>
                  </button>
                ))}

                {slot.count < slot.max && (
                  <button
                  onClick={() => {
                    const getGameDateTime = (team) => {
                      const info = gameInfoMap[team]
                      console.log('📋 gameInfoMap[team]:', info)
                      const timeMatch = info?.match(/\d{2}:\d{2}/)
                      const timeStr = timeMatch ? timeMatch[0] : '23:59'
                      console.log('🕐 抓到的比賽時間字串:', timeStr)
                      const dateObj = new Date(`${selectedDate}T${timeStr}:00+08:00`)
                      console.log('📅 比賽預定時間:', dateObj.toISOString())
                      return dateObj
                    }
                  
                    const now = new Date()
                    const taiwanNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
                    console.log('🕒 現在台灣時間:', taiwanNow.toISOString())
                  
                    const gameDateTime = getGameDateTime(moveTarget.Team)
                    const isLocked = taiwanNow >= gameDateTime
                    console.log('🔒 是否鎖定:', isLocked)
                  
                    if (isLocked) {
                      setMoveMessage(`${moveTarget.Team} 比賽已開始，禁止異動位置`)
                      console.log('⛔ 鎖定，無法異動')
                      setTimeout(() => setMoveMessage(''), 3000)
                      return
                    }
                  
                    console.log(`✅ 準備將 ${moveTarget.Name} 移動到 ${posKey}`)
                    setAssignedPositions(prev => {
                      const updated = {
                        ...prev,
                        [moveTarget.Name]: posKey
                      }
                      console.log('📝 更新後位置:', updated)
                      saveAssigned(updated)
                      return updated
                    })
                  
                    setMoveMessage(`${moveTarget.Name} 被移動到 ${posKey}`)
                    setTimeout(() => setMoveMessage(''), 2000)
                  
                    setMoveTarget(null)
                    setMoveSlots(null)
                  }}
                  
                  
                  
                    className="w-full flex items-center justify-center text-blue-600 font-semibold border-2 border-dashed border-blue-400 p-3 rounded bg-white hover:bg-blue-50"
                  >
                    ➕ Empty
                  </button>
                )}

 
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}