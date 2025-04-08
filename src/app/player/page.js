'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
      const [statusRes, statsRes, registerRes, positionRes] = await Promise.all([
        fetch('/api/playerStatus'),
        fetch('/api/playerStats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: type.toLowerCase(), from: fromDate, to: toDate })
        }),
        fetch('/api/playerRegisterStatus'),
        fetch('/api/playerPositionCaculate')
      ])

      const [statusData, statsData, registerData, positionData] = await Promise.all([
        statusRes.json(),
        statsRes.ok ? statsRes.json() : [],
        registerRes.ok ? registerRes.json() : [],
        positionRes.ok ? positionRes.json() : []
      ])

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

  const renderCell = (val) => {
    const isGray = val === 0 || val === '0.00' || val === '.000'
    return (
      <td className={`p-2 font-bold whitespace-nowrap text-s ${isGray ? 'text-gray-400' : ''}`}>
        {val ?? 0}
      </td>
    )
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
          onClick={openConfirmDialog}
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
                  className="p-2 border text-left whitespace-nowrap sticky top-0 z-10 bg-white"
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
                  
                    <span>{p.Name}</span>
                    <span className="text-sm text-gray-500 ml-1">{p.Team} - {(p.finalPosition || []).join(', ')}</span>
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
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.AB) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.R) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.H) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.HR) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.RBI) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.SB) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.K) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.BB) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.GIDP) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.XBH) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.TB) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(formatAvg(p.AVG)) || '.000'}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(formatAvg(p.OPS)) || '.000'}</td>
                    </> 
                  ) : (
                    <>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.IP) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.W) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.L) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.HLD) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.SV) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.H) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.ER) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.K) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.BB) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.QS) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.OUT) || 0}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.ERA) || '0.00'}</td>
                      <td className="p-2 font-bold whitespace-nowrap text-s">{renderCell(p.WHIP) || '0.00'}</td>
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
    </>
  )
}