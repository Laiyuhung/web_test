'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

export default function PlayerPage() {
  const [managerMap, setManagerMap] = useState({})
  const [taiwanToday, setTaiwanToday] = useState('')
  const [gameInfoMap, setGameInfoMap] = useState({})
  const [startingPitchers, setStartingPitchers] = useState([])
  const [startingLineup, setStartingLineup] = useState([])
  const [lineupTeams, setLineupTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('Batter')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [range, setRange] = useState('2025 Season')
  const [identity, setIdentity] = useState('All Identities')
  const [team, setTeam] = useState('All teams')
  const [status, setStatus] = useState('Market')
  const [register, setRegister] = useState('所有球員')
  const [position, setPosition] = useState('Util')
  const [sortBy, setSortBy] = useState('AB')
  const [sortMethod, setSortMethod] = useState('Descending')
  const [userId, setUserId] = useState(null)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('')
  const [confirmPlayer, setConfirmPlayer] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [assignedPositions, setAssignedPositions] = useState([])
  const [weeklyAdds, setWeeklyAdds] = useState(0)

  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  const [dropPlayer, setDropPlayer] = useState('');
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const [myRosterPlayers, setMyRosterPlayers] = useState([])

  const [forcedDropOptions, setForcedDropOptions] = useState([]) // 強制 drop 名單
  const [forcedDropReason, setForcedDropReason] = useState('') // 顯示原因
  const [forcedDropDialogOpen, setForcedDropDialogOpen] = useState(false)

  const today = new Date()
  const formatDateInput = (date) => date.toISOString().slice(0, 10)
  

  const fetchPlayerStatSummary = async (playerName, type) => {
    const ranges = {
      Today: [taiwanToday, taiwanToday],
      Yesterday: [formatDateInput(new Date(today.getTime() - 1 * 86400000)), formatDateInput(new Date(today.getTime() - 1 * 86400000))],
      'Last 7 days': [formatDateInput(new Date(today.getTime() - 7 * 86400000)), formatDateInput(new Date(today.getTime() - 1 * 86400000))],
      'Last 14 days': [formatDateInput(new Date(today.getTime() - 14 * 86400000)), formatDateInput(new Date(today.getTime() - 1 * 86400000))],
      'Last 30 days': [formatDateInput(new Date(today.getTime() - 30 * 86400000)), formatDateInput(new Date(today.getTime() - 1 * 86400000))],
      '2025 Season': ['2025-03-27', '2025-11-30'],
    }
    
  
    const result = {}
  
    for (const [label, [from, to]] of Object.entries(ranges)) {
      try {
        const res = await fetch('/api/playerStats/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName, type })
        })
        const data = await res.json()
        result[label] = data[label] || null
      } catch (e) {
        console.error(`❌ 無法取得 ${label} 區間資料:`, e)
        result[label] = null
      }
    }
    
  
    return result
  }
  

  const fetchWeeklyAddCount = async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/transaction/weekly_add_count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: userId }),
      })
      const data = await res.json()
      console.log('📊 查詢結果 count:', data)
      if (res.ok) {
        setWeeklyAdds(data.count || 0)
      } else {
        console.warn('⚠️ 無法取得 Add 次數:', data.error)
      }
    } catch (err) {
      console.error('❌ Add 次數取得錯誤:', err)
    }
  }
  

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
      case 'Last 7 days': {
        const last7 = new Date(today)
        last7.setDate(last7.getDate() - 7)
        const yest = new Date(today)
        yest.setDate(yest.getDate() - 1)
        from = formatDateInput(last7)
        to = formatDateInput(yest)
        break
      }
      case 'Last 14 days': {
        const last14 = new Date(today)
        last14.setDate(last14.getDate() - 14)
        const yest = new Date(today)
        yest.setDate(yest.getDate() - 1)
        from = formatDateInput(last14)
        to = formatDateInput(yest)
        break
      }
      case 'Last 30 days': {
        const last30 = new Date(today)
        last30.setDate(last30.getDate() - 30)
        const yest = new Date(today)
        yest.setDate(yest.getDate() - 1)
        from = formatDateInput(last30)
        to = formatDateInput(yest)
        break
      }
      case '2025 Season':
      default:
        from = '2025-03-27'
        to = '2025-11-30'
        break
    }
    setFromDate(from)
    setToDate(to)
  }

  useEffect(() => {
    if (userId && taiwanToday) {
      fetchWeeklyAddCount()
    }
  }, [userId, taiwanToday])

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await fetch('/api/managers')
        const data = await res.json()
        if (Array.isArray(data)) {
          const map = {}
          data.forEach(m => {
            map[m.id.toString()] = m.team_name
          })
          setManagerMap(map)
        }
      } catch (err) {
        console.error('❌ 無法取得 manager 名單:', err)
      }
    }
    fetchManagers()
  }, [])
  

  useEffect(() => {
    const now = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000
    const taiwanNow = new Date(now.getTime() + taiwanOffset)
    const todayStr = taiwanNow.toISOString().slice(0, 10)
    setTaiwanToday(todayStr)
  }, [])
  

  useEffect(() => {
    if (!taiwanToday) return
    const fetchStartingPitchers = async () => {
      try {
        const res = await fetch(`/api/starting-pitcher/load?date=${taiwanToday}`)
        const data = await res.json()
        setStartingPitchers(res.ok ? data : [])
      } catch (err) {
        console.error('❌ 無法取得先發投手:', err)
        setStartingPitchers([])
      }
    }
    fetchStartingPitchers()
  }, [taiwanToday])
  
  
  useEffect(() => {
    if (!taiwanToday) return
    const fetchStartingLineup = async () => {
      const [lineupRes, teamRes] = await Promise.all([
        fetch(`/api/starting-lineup/load?date=${taiwanToday}`),
        fetch(`/api/starting-lineup/teams?date=${taiwanToday}`)
      ])
      const [lineup, teams] = await Promise.all([
        lineupRes.json(),
        teamRes.json()
      ])
      setStartingLineup(lineupRes.ok ? lineup : [])
      setLineupTeams(teamRes.ok ? teams : [])
    }
    fetchStartingLineup()
  }, [taiwanToday])
  
  
  useEffect(() => {
    if (!taiwanToday || players.length === 0) return
    const fetchGameInfo = async () => {
      const teams = [...new Set(players.map(p => p.Team))]
      const map = {}
      for (const team of teams) {
        try {
          const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: taiwanToday, team })
          })
          const data = await res.json()
          map[team] = data.info || 'No game'
        } catch (err) {
          map[team] = 'No game'
        }
      }
      setGameInfoMap(map)
    }
    fetchGameInfo()
  }, [players, taiwanToday])
  
  


  useEffect(() => {
    applyDateRange(range)
  }, [range])

  useEffect(() => {
    setPosition(type === 'Batter' ? 'Util' : 'P')
    setSortBy(type === 'Batter' ? 'AB' : 'IP')
  }, [type])

  const fetchStatsAndStatus = async () => {
    if (!fromDate || !toDate) return
    setLoading(true)
    setError('')
    try {
      const [statusRes, statsRes, registerRes, positionRes, assignedRes] = await Promise.all([
  			fetch('/api/playerStatus'),
  			fetch('/api/playerStats', {
    			method: 'POST',
    			headers: { 'Content-Type': 'application/json' },
    			body: JSON.stringify({ type: type.toLowerCase(), from: fromDate, to: toDate })
  			}),
  			fetch('/api/playerRegisterStatus'),
  			fetch('/api/playerPositionCaculate'),
  			fetch(`/api/saveAssigned/load?date=${taiwanToday}`)
			])

      const [statusData, statsData, registerData, positionData, assignedData] = await Promise.all([
        statusRes.json(),
        statsRes.ok ? statsRes.json() : [],
        registerRes.ok ? registerRes.json() : [],
        positionRes.ok ? positionRes.json() : [],
        assignedRes.ok ? assignedRes.json() : []
      ])
      
      setAssignedPositions(assignedData) // ⬅️ 要補這行，才會讓 isDropBlocked 拿到最新資料
      // console.log('📌 positionData', positionData)

      

      const merged = statusData.map(p => {
        const stat = statsData.find(s => s.name === p.Name)
        const register = registerData.find(r => r.name === p.Name)
        const registerStatus = register?.status || '未知'
        const posData = positionData.find(pos => pos.name === p.Name)
        const finalPosition = posData?.finalPosition || []
        const identityType = p.identity || '未知'

        return {
          ...p,
          ...(stat || {}),
          registerStatus,
          finalPosition,
          identity: identityType
        }
      })

      const filtered = merged.filter(p => {
        if (search && !p.Name.includes(search)) return false
        if (type === 'Batter' && p.B_or_P !== 'Batter') return false
        if (type === 'Pitcher' && p.B_or_P !== 'Pitcher') return false
        if (identity !== 'All Identities' && p.identity !== identity) return false
        if (team !== 'All teams' && p.Team !== team) return false
        const statusLower = (p.status || '').toLowerCase()
        if (status !== 'All Players') {
          if (status === 'Market') {
            if (!(statusLower === 'free agent' || statusLower === 'waiver')) return false;
          } else if (!statusLower.includes(status.toLowerCase())) {
            return false;
          }
        }
        if (register !== '所有球員') {
          if (register === '一軍' && ['二軍', '未註冊', '註銷'].includes(p.registerStatus)) return false
          if (register === '未註冊' && !['未註冊', '註銷'].includes(p.registerStatus)) return false
          if (register === '二軍' && !['二軍', '註銷', '未註冊'].includes(p.registerStatus)) return false
          if (register === '註銷' && p.registerStatus !== '註銷') return false
        }
        if (position !== 'Util' && position !== 'P') {
          if (!(p.finalPosition || []).some(pos => pos.includes(position))) return false
        }
        return true
      })

      const sorted = [...filtered].sort((a, b) => {
        const aVal = parseFloat(a[sortBy] || 0)
        const bVal = parseFloat(b[sortBy] || 0)
        return sortMethod === 'Ascending' ? aVal - bVal : bVal - aVal
      })
      
      setPlayers(sorted)

      const myPlayers = merged.filter(p => p.manager_id?.toString() === userId)
      setMyRosterPlayers(myPlayers) 

    } catch (err) {
      console.error('統計錯誤:', err)
      setError('統計讀取失敗')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStatsAndStatus()
  }, [search, type, fromDate, toDate, identity, team, status, register, position, sortBy, sortMethod])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]
      setUserId(storedId || null)
    }
  }, [])

  const formatDate = (str) => {
    if (!str) return 'wrong1'
  
    // 把 "+00:00" 換成 "Z"
    const fixedStr = str.replace('+00:00', 'Z')
    const d = new Date(fixedStr)
  
    if (isNaN(d)) return 'wrong2'
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  
  

  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  const formatDecimal2 = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  const sendEmailNotification = async (type, playerName, managerName) => {
    const action = type
    const recipients = [
      'mar.hung.0708@gmail.com',
      'laiyuhung921118@gmail.com',
      'peter0984541203@gmail.com',
      'anthonylin6507@gmail.com',
    ]
  
    try {
      await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients.join(','),
          subject: `⚾️ Fantasy 動態通知：${managerName} ${action} ${playerName}`,
          html: `
            <p><b>${managerName}</b>  ${action} <b>${playerName}</b></p>
            <p>📅 時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
          `
        })
      })
      console.log('📧 通知信已發送')
    } catch (err) {
      console.error('❌ 發信失敗:', err)
    }
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
  const isDropBlocked = (p) => {
    const clean = (name) => name.replace(/[#◎＊*]/g, '')
    const assigned = assignedPositions.find(pos =>
      clean(pos.player_name) === clean(p.Name)
    )
    const assignedPosition = assigned?.position || 'BN'
    const isStarter = !['NA', 'NA(備用)', 'BN'].includes(assignedPosition)
  
    const gameInfo = gameInfoMap[p.Team] || ''
    const isPostponedOrNoGame = gameInfo.includes('No game') || gameInfo.includes('PPD')
    const gameTimeMatch = gameInfo.match(/(\d{1,2}):(\d{2})/)
  
    const nowUTC = new Date()
    const taiwanNow = new Date(nowUTC.getTime())
  
    if (!isPostponedOrNoGame && isStarter && gameTimeMatch) {
      const [_, hour, minute] = gameTimeMatch
      const gameTime = new Date(taiwanNow)
      gameTime.setHours(Number(hour))
      gameTime.setMinutes(Number(minute))
      gameTime.setSeconds(0)
      gameTime.setMilliseconds(0)
  
      console.log('🧪 判斷是否已開賽 (Drop Blocked)', {
        name: p.Name,
        assignedPosition,
        isStarter,
        gameInfo,
        gameTime: gameTime.toISOString(),
        taiwanNow: taiwanNow.toISOString(),
        result: taiwanNow >= gameTime
      })
  
      return taiwanNow >= gameTime
    }
  
    console.log('✅ 無 Drop 限制 (未開賽或非先發)', {
      name: p.Name,
      assignedPosition,
      isStarter,
      gameInfo,
      isPostponedOrNoGame,
      gameTimeMatch
    })
  
    return false
  }
  
  
  
  

  const positionOptions = type === 'Batter'
    ? ['Util', 'C', '1B', '2B', '3B', 'SS', 'OF']
    : ['P', 'SP', 'RP']

  const sortOptions = type === 'Batter'
    ? ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
    : ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']

    
  const renderActionButton = (p) => {
    const status = (p.status || '').toLowerCase();
    const ownerId = p.manager_id?.toString() || null;
    const isOwner = ownerId === userId;
  
    const openConfirmDialog = () => {
      setConfirmPlayer(p);
      setDialogOpen(true);
    };
  
    let borderColor = "border-gray-500";
    let textColor = "text-gray-500";
  
    if (status === "free agent") {
      borderColor = "border-green-600";
      textColor = "text-green-600";
    } else if (status.includes("on team") && p.owner && p.owner !== "-" && isOwner) {
      borderColor = "border-red-600";
      textColor = "text-red-600";
    } else if (status.includes("waiver")) {
      borderColor = "border-yellow-500";
      textColor = "text-yellow-500";
    } else {
      borderColor = "border-blue-600";
      textColor = "text-blue-600";
    }
  
    return (
      <div
        className={`border-2 ${borderColor} rounded-full p-2 flex items-center justify-center cursor-pointer`}
        onClick={() => {
  if (status === "waiver") {
    setConfirmPlayer(p);
    setDropPlayer('');
    setWaiverDialogOpen(true);
  } else if (status.includes("on team") && p.owner && p.owner !== "-" && isOwner) {
    if (isDropBlocked(p)) {
      setSuccessMessage('⚠️ 該球員已開賽，無法進行 Drop 操作')
      setSuccessDialogOpen(true)
      return
    }
    setConfirmPlayer(p);
    setDialogOpen(true);
  } else if (status === "free agent") {
    checkAddConstraints(p);
  } else {
    setSuccessMessage('⚠️ 此功能尚未啟用，如需交易請通知管理員');
    setSuccessDialogOpen(true);
  }
  
}}
      >
        <span className={`${textColor} font-bold`}>
          {status === "free agent"
            ? "＋"
            : status.includes("on team") && p.owner && p.owner !== "-" && isOwner
            ? "－"
            : status.includes("waiver")
            ? "＋"
            : "⇄"}
        </span>
      </div>
    );
  };

  
    
  const checkAddConstraints = (player) => {
    const isForeign = player.identity === '洋將'
    const onTeamForeign = myRosterPlayers.filter(p =>
      p.identity === '洋將' && (p.status || '').toLowerCase().includes('on team')
    ).length
  
    // 抓出我隊上的 active 洋將與 active 所有球員（從 myRosterPlayers 名字比對 assignedPositions）
    const myNames = myRosterPlayers.map(p => p.Name)
    const activeAssigned = assignedPositions.filter(p =>
      myNames.includes(p.player_name) && !['NA', 'NA(備用)'].includes(p.position)
    )
    const activeForeign = myRosterPlayers.filter(p => {
      const isForeign = p.identity === '洋將'
      const isOnTeam = (p.status || '').toLowerCase().includes('on team')
      const assigned = assignedPositions.find(pos =>
        pos.player_name === p.Name && !['NA', 'NA(備用)'].includes(pos.position)
      )
      return isForeign && isOnTeam && assigned
    }).length
    
    const activeRoster = activeAssigned.length

    const oneGunNAPlayers = assignedPositions.filter(pos => {
      const player = myRosterPlayers.find(p => p.Name === pos.player_name)

       // 🧪 印出每位檢查球員的資訊
      console.log('🔍 檢查球員:', {
        name: pos.player_name,
        registerStatus: player?.registerStatus,
        assignedPosition: pos.position
      })

      return (
        player?.registerStatus === '一軍' &&
        ['NA'].includes(pos.position)
      )
    })
    
    if (oneGunNAPlayers.length > 0 && player.status?.toLowerCase() === 'free agent') {
      console.log('❌ 有一軍球員在 NA，不可 Add 自由球員')
      setSuccessMessage('⚠️ 請先將一軍球員移出 NA，再加入自由球員')
      setSuccessDialogOpen(true)
      return false
    }
    
  
    console.log('📊 檢查資料:', {
      player,
      isForeign,
      weeklyAdds,
      onTeamForeign,
      activeForeign,
      activeRoster
    })
  
    if (!myRosterPlayers.length) {
      console.log('⏳ 名單尚未載入')
      setSuccessMessage('⚠️ 請稍候，球隊名單尚未載入完成')
      setSuccessDialogOpen(true)
      return false
    }
  
    if (weeklyAdds >= 6) {
      console.log('❌ 本週加入已滿 6 次')
      setSuccessMessage('⚠️ 本週可加入次數已達上限（6 次）')
      setSuccessDialogOpen(true)
      return false
    }
  
    if (isForeign) {
      if (onTeamForeign >= 4) {
        console.log('❌ 隊上洋將已滿 4 位（On Team）')
        const cleanName = (str) => str.replace(/[#◎＊*]/g, '')
        const options = myRosterPlayers
        .filter(p => {
          const isForeign = p.identity === '洋將'
          const isOnTeam = (p.status || '').toLowerCase().includes('on team')
          const assigned = assignedPositions.find(pos =>
            cleanName(pos.player_name) === cleanName(p.Name) &&
            !['NA', 'NA(備用)'].includes(pos.position)
          )
          return isForeign && isOnTeam && assigned
        })
        .map(p => {
          const assigned = assignedPositions.find(pos =>
            cleanName(pos.player_name) === cleanName(p.Name)
          )
          return {
            player_name: p.Name,
            position: assigned?.position || 'NA',
          }
        })
        console.log('🔍 可選 Drop 洋將名單（4上限）:', options)
        setForcedDropReason('隊上洋將已達 4 位，請選擇一位 Active 洋將進行 Drop')
        setForcedDropOptions(options)
        setConfirmPlayer(player)
        setForcedDropDialogOpen(true)
        return false
      }
      
      if (activeForeign >= 3) {
        console.log('❌ Active 洋將已滿 3 位')
        const cleanName = (str) => str.replace(/[#◎＊*]/g, '')
        const options = myRosterPlayers
        .filter(p => {
          const isForeign = p.identity === '洋將'
          const isOnTeam = (p.status || '').toLowerCase().includes('on team')
          const assigned = assignedPositions.find(pos =>
            cleanName(pos.player_name) === cleanName(p.Name) &&
            !['NA', 'NA(備用)'].includes(pos.position)
          )
          return isForeign && isOnTeam && assigned
        })
        .map(p => {
          const assigned = assignedPositions.find(pos =>
            cleanName(pos.player_name) === cleanName(p.Name)
          )
          return {
            player_name: p.Name,
            position: assigned?.position || 'NA',
          }
        })
        console.log('🔍 可選 Drop 洋將名單（3 active 限制）:', options)
        setForcedDropReason('Active 洋將已達 3 位，請選擇一位 Active 洋將進行 Drop')
        setForcedDropOptions(options)
        setConfirmPlayer(player)
        setForcedDropDialogOpen(true)
        return false
      }
      
    }
  
    if (activeRoster >= 26) {
      const options = assignedPositions.filter(p =>
        myNames.includes(p.player_name) && !['NA', 'NA(備用)'].includes(p.position)
      )
      console.log('❌ Active 名單已滿 26 位')
      console.log('🔍 可選 Drop Active 名單:', options)
      setForcedDropReason('Active 名單已滿 26 位，請選擇一位 Active 球員進行 Drop')
      setForcedDropOptions(options)
      setConfirmPlayer(player)
      setForcedDropDialogOpen(true)
      return false
    }
    
  
    console.log('✅ 通過所有限制，可加入')
    setConfirmPlayer(player)
    setDialogOpen(true)
    return true
  }
  
  
  
 
  return (
    <>
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">PLAYERS</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-4 max-w-sm">
        <label className="text-sm font-semibold">Search</label>
        <div className="flex gap-2 w-full max-w-sm">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="球員名稱"
            className="flex-grow border px-2 py-1 rounded"
          />
          <button
            onClick={() => setSearch(searchInput)}
            className="bg-blue-600 text-white px-4 py-1 rounded whitespace-nowrap"
          >
            搜尋
          </button>
        </div>


      </div>

      <div className="overflow-x-auto w-full mb-4">
        <div className="flex gap-4 items-end px-4 py-2 rounded-lg border bg-white w-max min-w-full">
          <div>
            <label className="text-sm font-semibold">Batter/Pitcher</label>
            <select value={type} onChange={e => setType(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option value="Batter">Batter</option>
              <option value="Pitcher">Pitcher</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Identities</label>
            <select value={identity} onChange={e => setIdentity(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option>All Identities</option>
              <option>本土</option>
              <option>洋將</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Teams</label>
            <select value={team} onChange={e => setTeam(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option>All teams</option>
              <option>統一獅</option>
              <option>樂天桃猿</option>
              <option>富邦悍將</option>
              <option>味全龍</option>
              <option>中信兄弟</option>
              <option>台鋼雄鷹</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option>All Players</option>
              <option>On Team</option>
              <option>Free Agent</option>
              <option>Waiver</option>
              <option>Market</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">升降</label>
            <select value={register} onChange={e => setRegister(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option>所有球員</option>
              <option>一軍</option>
              <option>二軍</option>
              <option>未註冊</option>
              <option>註銷</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Position</label>
            <select value={position} onChange={e => setPosition(e.target.value)} className="border px-2 py-1 rounded w-full">
              {positionOptions.map(pos => <option key={pos}>{pos}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Stats Range</label>
            <select value={range} onChange={e => setRange(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option>Today</option>
              <option>Yesterday</option>
              <option>Last 7 days</option>
              <option>Last 14 days</option>
              <option>Last 30 days</option>
              <option>2025 Season</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Sort by</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border px-2 py-1 rounded w-full">
              {sortOptions.map(field => <option key={field}>{field}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Sort method</label>
            <select value={sortMethod} onChange={e => setSortMethod(e.target.value)} className="border px-2 py-1 rounded w-full">
              <option>Descending</option>
              <option>Ascending</option>
            </select>
          </div>
        </div>
      </div>

      <span className="text-sm text-gray-600">Stats range：{fromDate} ~ {toDate}</span>

      {loading && <div className="mb-4">Loading...</div>}
      
      <div className="overflow-auto max-h-[600px] w-full">
        <table className="text-sm w-full text-center whitespace-nowrap">
          <thead className="bg-gray-200 sticky top-0 z-20">
            <tr>
              {type === 'Batter' ? (
                <>
                  <th className="p-2 border font-bold sticky top-0 z-20">AB</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">R</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">H</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">HR</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">RBI</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">SB</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">K</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">BB</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">GIDP</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">XBH</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">TB</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">AVG</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">OPS</th>
                </>
              ) : (
                <>
                  <th className="p-2 border font-bold sticky top-0 z-20">IP</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">W</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">L</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">HLD</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">SV</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">H</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">ER</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">K</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">BB</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">QS</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">OUT</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">ERA</th>
                  <th className="p-2 border font-bold sticky top-0 z-20">WHIP</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <>
                <tr>
                <td
                  colSpan={type === 'Batter' ? 13 : 13}
                  className="p-2 border text-left whitespace-nowrap"
                >

                  <div className="flex items-center gap-1 font-bold text-[#0155A0] text-base">
                  <div className="text-xl">
                    {renderActionButton(p)}
                  </div>
                  <img
                      src={`/photo/${p.Name}.png`} // 根據球員名稱動態加載圖片
                      alt={`${p.Name} Avatar`}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => e.target.src = '/photo/defaultPlayer.png'} // 若沒有圖片，顯示預設圖片
                    />
                  
                  <div className="flex flex-col">
                    {/* 第一行：名字、隊伍、守位 */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-base font-bold text-[#0155A0] cursor-pointer underline"
                        onClick={async () => {
                          setSelectedPlayerDetail(p)
                          setDetailDialogOpen(true)
                          
                          // 👇 取得多區間數據
                          const summary = await fetchPlayerStatSummary(p.Name, type.toLowerCase())
                          setSelectedPlayerDetail(prev => ({
                            ...prev,
                            statSummary: summary,
                          }))
                        }}
                      >
                        {p.Name}
                      </span>

                      <span className="text-sm text-gray-500">{p.Team} - {(p.finalPosition || []).join(', ')}</span>
                    </div>

                    {/* 第二行：game info、打序、先發標記 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{gameInfoMap[p.Team] ?? 'No game'}</span>

                      {/* 打序：綠底號碼 or 紅底 X */}
                      {(() => {
                        const found = startingLineup.find(l => l.name === p.Name)
                        if (found) {
                          return (
                            <span className="text-white bg-green-700 text-xs font-bold px-2 py-0.5 rounded">
                              {found.batting_no}
                            </span>
                          )
                        }

                        if (p.B_or_P === 'Pitcher') return null

                        if (lineupTeams.includes(p.Team)) {
                          return (
                            <span className="text-white bg-red-600 text-xs font-bold px-2 py-0.5 rounded">X</span>
                          )
                        }

                        return null
                      })()}

                      {/* 投手先發 V 標記 */}
                      {startingPitchers.some(sp => sp.name === p.Name) && (
                        <span className="text-white bg-green-700 text-xs font-bold px-2 py-0.5 rounded">V</span>
                      )}
                    </div>
                  </div>

                    {['二軍', '未註冊', '註銷'].includes(p.registerStatus) && (
                      <span className="ml-1 inline-block bg-[#FDEDEF] text-[#D10C28] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {p.registerStatus === '二軍' ? 'NA' : p.registerStatus}
                      </span>
                    )}
                    {p.status && (
                      <>
                        {p.status === 'Free Agent' ? (
                          <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">FA</span>
                        ) : p.status === 'Waiver' && p.offWaivers ? (
                          <span className="ml-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">W {formatDate(p.offWaivers)}</span>
                        ) : p.owner && p.owner !== '-' ? (
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">{p.owner}</span>
                        ) : null}
                      </>
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
                      {renderCell(formatDecimal2(p.ERA))}
                      {renderCell(formatDecimal2(p.WHIP))}
                    </>
                  )}
                </tr>
              </>
            ))}
          </tbody>
        </table>

      </div>
    </div>
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
        <AlertDialogTitle>
          {confirmPlayer?.status?.toLowerCase().includes('on team') &&
          confirmPlayer?.manager_id?.toString() === userId
            ? '確定要Drop嗎？'
            : '確定要Add嗎？'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          您即將
          {confirmPlayer?.status?.toLowerCase().includes('on team') &&
          confirmPlayer?.manager_id?.toString() === userId
            ? 'Drop'
            : 'Add'}：{confirmPlayer?.Name}
        </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!confirmPlayer) return;
            
              const isOwner = confirmPlayer?.manager_id?.toString() === userId;
              const type = isOwner ? 'Drop' : 'Add';
            
              try {
                const res = await fetch('/api/transaction', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    playerName: confirmPlayer.Name,
                    type, // 👉 加入交易類型
                  }),
                });
            
                const data = await res.json();
                if (res.ok) {
                  setSuccessMessage(`✅ 成功${type === 'Add' ? '加入' : '移除'}球員`);
                  setSuccessDialogOpen(true);
                  await fetchStatsAndStatus(); // 🧩 加這行！

                  // ✅ 呼叫發信函式
                  await sendEmailNotification(type, confirmPlayer.Name, managerMap[userId] || '未知玩家')
                  
                } else {
                  setSuccessMessage(`❌ 錯誤: ${data.error}`);
                  setSuccessDialogOpen(true);
                }
              } catch (error) {
                console.error('交易處理錯誤:', error);
                alert('❌ 發生錯誤，請稍後再試');
              }
            
              setDialogOpen(false);
              setConfirmPlayer(null);
            }}
            
          >
            確定
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>交易結果</AlertDialogTitle>
        <AlertDialogDescription>
          {successMessage}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction onClick={() => setSuccessDialogOpen(false)}>
          關閉
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog open={waiverDialogOpen} onOpenChange={setWaiverDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>確定要申請 Waiver 嗎？</AlertDialogTitle>
        <AlertDialogDescription>
          加入球員：<b>{confirmPlayer?.Name}</b><br />
          <span className="text-sm text-gray-500">選擇是否要同時 Drop 一位球員：</span>
          <select
            className="border rounded px-2 py-1 w-full mt-2"
            value={dropPlayer}
            onChange={e => setDropPlayer(e.target.value)}
          >
            <option value="">不選擇 Drop</option>
            {myRosterPlayers
              .filter(p => p.Name !== confirmPlayer?.Name)
              .map(p => (
                <option key={p.Name} value={p.Name}>
                  {p.Name}({(p.finalPosition || []).join(', ')})
                </option>
            ))}
          </select>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction
          onClick={async () => {
            const res = await fetch('/api/waiver', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apply_time: new Date().toISOString(),
                manager: userId,
                add_player: confirmPlayer?.Name,
                off_waiver: confirmPlayer?.offWaivers,
                drop_player: dropPlayer || null,
              }),
            });

            const data = await res.json();
            if (res.ok) {
              setSuccessMessage('✅ Waiver 申請成功');
              setSuccessDialogOpen(true);
              await fetchStatsAndStatus(); // 重新刷新
            } else if (data.error?.includes('已申請過')) {
              setSuccessMessage('⚠️ 此球員您已申請過 Waiver，請勿重複申請');
              setSuccessDialogOpen(true);
            }else {
              setSuccessMessage(`❌ 錯誤：${data.error}`);
              setSuccessDialogOpen(true);
            }

            setWaiverDialogOpen(false);
            setConfirmPlayer(null);
          }}
        >
          確定申請
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
  <AlertDialogContent className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
    <AlertDialogHeader>
      <AlertDialogTitle>{selectedPlayerDetail?.Name} 詳細資料</AlertDialogTitle>
    </AlertDialogHeader>

    <AlertDialogDescription>
      {/* 不擴張寬度的簡介資料 */}
      <div className="bg-white border-b py-2 space-y-1 text-sm text-gray-700 text-left">
        <div>team：{selectedPlayerDetail?.Team}</div>
        <div>position：{(selectedPlayerDetail?.finalPosition || []).join(', ')}</div>
        <div>identity：{selectedPlayerDetail?.identity}</div>
        <div>status：{selectedPlayerDetail?.status}</div>
        <div>升降：{selectedPlayerDetail?.registerStatus}</div>
      </div>

      {/* 獨立橫向滑動的表格容器 */}
      {selectedPlayerDetail?.statSummary && (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[950px] w-max">
            <table className="text-xs text-center border w-full table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  {(type === 'Batter'
                    ? ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
                    : ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
                  ).map(k => (
                    <th key={k} className="border px-2">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedPlayerDetail.statSummary).map(([label, stats]) => (
                  <React.Fragment key={label}>
                    <tr className="bg-gray-50 text-left text-sm">
                      <td colSpan={type === 'Batter' ? 13 : 13} className="px-2 py-1 font-bold text-gray-700">
                        {label}
                      </td>
                    </tr>
                    <tr>
                      {(type === 'Batter'
                        ? ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
                        : ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
                      ).map(k => (
                        <td key={k} className="border px-2 py-1 text-center">{stats?.[k] ?? '-'}</td>
                      ))}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AlertDialogDescription>

    <AlertDialogFooter className="mt-4">
      <AlertDialogAction onClick={() => setDetailDialogOpen(false)}>
        關閉
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>



  <AlertDialog open={forcedDropDialogOpen} onOpenChange={setForcedDropDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>⚠️ 限制條件：需要強制 Drop</AlertDialogTitle>
      <AlertDialogDescription>
        {forcedDropReason}<br />
        <span className="text-sm text-gray-500">選擇一位球員進行 Drop：</span>
        <select
          className="border rounded px-2 py-1 w-full mt-2"
          value={dropPlayer}
          onChange={e => setDropPlayer(e.target.value)}
        >
          <option value="">請選擇一位要 Drop 的球員</option>
          {forcedDropOptions.map(p => (
            <option key={p.player_name} value={p.player_name}>
              {p.player_name}（{p.position || '位置不明'}）
            </option>
          ))}

        </select>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction
        disabled={!dropPlayer}
        onClick={async () => {
          const res = await fetch('/api/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerName: confirmPlayer?.Name,
              type: 'Add',
              dropPlayer: dropPlayer
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setSuccessMessage(`✅ 成功加入球員並 Drop ${dropPlayer}`)
            setSuccessDialogOpen(true)
            await fetchStatsAndStatus()

            // ⬇️ ✅✅✅ 加在這裡（寄信通知）
            await sendEmailNotification(
              `Add ${confirmPlayer?.Name} / Drop ${dropPlayer}`,
              confirmPlayer?.Name, 
              managerMap[userId] || '未知玩家'
            )


          } else {
            setSuccessMessage(`❌ 錯誤: ${data.error}`)
            setSuccessDialogOpen(true)
          }

          setForcedDropDialogOpen(false)
          setConfirmPlayer(null)
          setDropPlayer('')
        }}
      >
        確定
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>


    </>
  )
}