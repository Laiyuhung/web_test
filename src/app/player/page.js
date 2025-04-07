'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

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
  const [status, setStatus] = useState('All Players')
  const [register, setRegister] = useState('所有球員')
  const [position, setPosition] = useState('Util')
  const [sortBy, setSortBy] = useState('AB')
  const [sortMethod, setSortMethod] = useState('Descending')
  const [userId, setUserId] = useState(null)


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
        if (type === 'Batter' && p.B_or_P !== 'Batter') return false
        if (type === 'Pitcher' && p.B_or_P !== 'Pitcher') return false
        if (identity !== 'All Identities' && p.identity !== identity) return false
        if (team !== 'All teams' && p.Team !== team) return false
        const statusLower = (p.status || '').toLowerCase()
        if (status !== 'All Players' && !statusLower.includes(status.toLowerCase())) return false
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
  }, [type, fromDate, toDate, identity, team, status, register, position, sortBy, sortMethod])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]
      setUserId(storedId || null)
    }
  }, [])

  const formatDate = (str) => {
    const d = new Date(str)
    if (isNaN(d)) return ''
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  const formatAvg = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '.000' : num.toFixed(3).replace(/^0/, '')
  }

  const positionOptions = type === 'Batter'
    ? ['Util', 'C', '1B', '2B', '3B', 'SS', 'OF']
    : ['P', 'SP', 'RP']

  const sortOptions = type === 'Batter'
    ? ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
    : ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']

    
    const renderActionButton = (p) => {
      const status = (p.status || '').toLowerCase()
      const ownerId = p.manager_id?.toString() || null
      const isOwner = ownerId === userId
  
      if (status === 'free agent') {
        return <span className="text-green-600 font-bold">＋</span>
      }
      if (p.status?.includes('On Team') && p.owner && p.owner !== '-' && isOwner) {
        return <span className="text-red-600 font-bold">－</span>
      }
      if (status.includes('waiver')) {
        return <span className="text-yellow-500 font-bold">＋</span>
      }
      return <span className="text-blue-600 font-bold">⇄</span>
    }
    
    
    

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">球員狀態與數據</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 items-center mb-4">
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
      <span className="text-sm text-gray-600">查詢區間：{fromDate} ~ {toDate}</span>

      {loading && <div className="mb-4">Loading...</div>}

      <Card>
        <CardContent className="overflow-auto max-h-[600px] p-4">
          <table className="text-sm w-full text-center border whitespace-nowrap">
            <thead className="bg-gray-200 sticky top-0 z-20">
              <tr>
                <th className="p-2 border font-bold sticky left-0 z-20"></th>
                <th className="p-2 border bg-gray-200 sticky left-0 z-20 text-left">Player</th>
                <th className="p-2 border font-bold">Status</th>
                {type === 'Batter' ? (
                  <>
                    <th className="p-2 border font-bold">AB</th>
                    <th className="p-2 border font-bold">R</th>
                    <th className="p-2 border font-bold">H</th>
                    <th className="p-2 border font-bold">HR</th>
                    <th className="p-2 border font-bold">RBI</th>
                    <th className="p-2 border font-bold">SB</th>
                    <th className="p-2 border font-bold">K</th>
                    <th className="p-2 border font-bold">BB</th>
                    <th className="p-2 border font-bold">GIDP</th>
                    <th className="p-2 border font-bold">XBH</th>
                    <th className="p-2 border font-bold">TB</th>
                    <th className="p-2 border font-bold">AVG</th>
                    <th className="p-2 border font-bold">OPS</th>
                  </> 
                ) : ( 
                  <> 
                    <th className="p-2 border font-bold">IP</th>
                    <th className="p-2 border font-bold">W</th>
                    <th className="p-2 border font-bold">L</th>
                    <th className="p-2 border font-bold">HLD</th>
                    <th className="p-2 border font-bold">SV</th>
                    <th className="p-2 border font-bold">H</th>
                    <th className="p-2 border font-bold">ER</th>
                    <th className="p-2 border font-bold">K</th>
                    <th className="p-2 border font-bold">BB</th>
                    <th className="p-2 border font-bold">QS</th>
                    <th className="p-2 border font-bold">OUT</th>
                    <th className="p-2 border font-bold">ERA</th>
                    <th className="p-2 border font-bold">WHIP</th>
                  </>
                )}
                
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border sticky left-0 z-10  text-lg font-bold whitespace-nowrap">{renderActionButton(p)}</td>
                  <td className="p-2 border sticky left-0 z-10  text-left font-bold text-[#0155A0] whitespace-nowrap">
                    <span>{p.Name}</span>
                    <span className="text-xs text-gray-500 ml-2">{p.Team}</span>
                    <span className="text-xs text-gray-500 ml-1"> - {(p.finalPosition || []).join(', ')}</span>
                    {['二軍', '未註冊', '註銷'].includes(p.registerStatus) && (
                      <span className="ml-1 inline-block bg-[#FDEDEF] text-[#D10C28] text-xs font-bold px-2 py-0.5 rounded-full">
                      {p.registerStatus === '二軍' ? 'NA' : p.registerStatus}
                      </span>
                    )}
                  </td>
                  <td className="p-2 border font-bold whitespace-nowrap">
                    {p.owner && p.owner !== '-' ? (
                      <span className="text-blue-600 font-semibold">On Team - {p.owner}</span>
                    ) : p.status === 'Waiver' && p.offWaivers ? (
                      <span className="bg-red-600 text-white font-semibold px-2 py-0.5 rounded">
                        off waivers {formatDate(p.offWaivers)}
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">{p.status}</span>
                    )}
                  </td>


                  {type === 'Batter' ? (
                    <>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.AB || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.R || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.H || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.HR || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.RBI || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.SB || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.K || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.BB || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.GIDP || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.XBH || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.TB || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.AVG || '0.000'}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.OPS || '0.000'}</td>
                    </> 
                  ) : ( 
                    <> 
                      <td className="p-2 border font-bold whitespace-nowrap">{p.IP || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.W || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.L || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.HLD || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.SV || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.H || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.ER || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.K || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.BB || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.QS || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.OUT || 0}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.ERA || '0.00'}</td>
                      <td className="p-2 border font-bold whitespace-nowrap">{p.WHIP || '0.00'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}