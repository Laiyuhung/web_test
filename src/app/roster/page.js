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
  const [selectedDate, setSelectedDate] = useState(() => {
  const taiwanTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
    return taiwanTime.toISOString().slice(0, 10)
  })
  




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

        await loadAssigned(myPlayers)
        setPositionsLoaded(true)
        setRosterReady(true)

      } catch (err) {
        console.error('讀取錯誤:', err)
      }
      setLoading(false)
    }

    if (userId) fetchData()
  }, [userId, fromDate, toDate, selectedDate]) 

  const fetchStatsSummary = async () => {
    const starterNames = players
      .filter(p => !['BN', 'NA', 'NA(備用)'].includes(assignedPositions[p.Name]))
      .map(p => p.Name)
  
    if (starterNames.length === 0) return
  
    try {
      const [batterRes, pitcherRes] = await Promise.all([
        fetch('/api/playerStatsSummary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'batter',
            from: selectedDate,
            to: selectedDate,
            playerNames: starterNames,
          })
        }),
        fetch('/api/playerStatsSummary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pitcher',
            from: selectedDate,
            to: selectedDate,
            playerNames: starterNames,
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
  
  const today = new Date()
    
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
    const todayStr = new Date().toISOString().slice(0, 10)
    const isEditable = selectedDate >= todayStr
  
    if (!isEditable) {
      // 過去日期：藍字純文字（不能點）
      return (
        <span className="text-[#004AAD] text-sm font-bold min-w-[36px] text-center">
          {currentValue}
        </span>
      )
    }
    
    // 今日或未來：原本的可互動圓圈按鈕
    return (
      <button
        onClick={() => openMoveModal(p)}
        className="bg-[#004AAD] hover:bg-[#003E7E] text-white text-xs font-bold w-9 h-9 rounded-full flex items-center justify-center"
      >
        {currentValue}
      </button>
    )
  }
  
  const openMoveModal = (player) => {
    console.log('🔁 可選位置:', player.finalPosition)
  
    const baseSlots = [...(player.finalPosition || []), player.B_or_P === 'Batter' ? 'Util' : 'P', 'BN']
    const naSlot = player.registerStatus === '一軍' ? 'NA(備用)' : 'NA'
    const allSlots = [...baseSlots, naSlot]
  
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
        const assigned = players.filter(p =>
          assignedPositions[p.Name] === 'NA' || assignedPositions[p.Name] === 'NA(備用)'
        )
  
        if (!slotStatus['NA']) {
          slotStatus['NA'] = {
            displayAs: naSlot, // 這裡保留目前要顯示的樣式（NA or NA(備用)）
            count: assigned.length,
            max: slotLimit['NA'],
            players: assigned
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
      const res = await fetch(`/api/saveAssigned/load?date=${selectedDate}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '讀取失敗')
  
      const map = {}
      playersList.forEach(p => {
        const record = data.find(r => r.player_name === p.Name)
        map[p.Name] = record?.position || 'BN'
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
  
  const formatTaiwanDateUSFormat = () => {
    const taiwanTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
    const weekday = taiwanTime.toLocaleDateString('en-US', { weekday: 'short' }) // e.g. "Thu"
    const month = taiwanTime.toLocaleDateString('en-US', { month: 'short' })     // e.g. "Apr"
    const day = taiwanTime.toLocaleDateString('en-US', { day: '2-digit' })       // e.g. "11"
    return `${weekday}, ${month} ${day}`
  }

  const formatDateToLabel = (isoDateStr) => {
    const date = new Date(isoDateStr + 'T00:00:00+08:00')
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.toLocaleDateString('en-US', { day: '2-digit' })
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
  .filter(p => p.B_or_P === 'Batter')
  .sort((a, b) => {
    const posA = assignedPositions[a.Name] || 'BN'
    const posB = assignedPositions[b.Name] || 'BN'
    return batterPositionOrder.indexOf(posA) - batterPositionOrder.indexOf(posB)
  })
  
  const pitchers = players
  .filter(p => p.B_or_P === 'Pitcher')
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
              setSelectedDate(prev.toISOString().slice(0, 10))
            }}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg"
          >
            ◀
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
              setSelectedDate(next.toISOString().slice(0, 10))
            }}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg"
          >
            ▶
          </button>
        </div>

        {/* 黑底白字的 Today 按鈕 */}
        <button
          onClick={() => {
            const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })
            const date = new Date(today).toISOString().slice(0, 10)
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

      {positionsLoaded && (
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
                      const currentPos = assignedPositions[moveTarget.Name]
                      const canReturn = (p.finalPosition || []).includes(currentPos) ||
                                        (p.B_or_P === 'Batter' && currentPos === 'Util') ||
                                        (p.B_or_P === 'Pitcher' && currentPos === 'P') ||
                                        currentPos === 'BN' ||
                                        currentPos === 'NA' || currentPos === 'NA(備用)'
                    
                      const fallback = 'BN'
                      const newPos = canReturn ? currentPos : fallback
                    
                      // ✅ 先關掉 modal，避免 React state 延遲導致沒關
                      setMoveTarget(null)
                      setMoveSlots(null)
                    
                      // ✅ 再更新位置
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
                      setAssignedPositions(prev => {
                        const updated = {
                          ...prev,
                          [moveTarget.Name]: posKey
                        }
                        saveAssigned(updated) // 👈 新增這行
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