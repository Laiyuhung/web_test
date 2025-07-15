'use client'

import { useEffect, useState } from 'react'

export default function MatchupTable() {
  const [week, setWeek] = useState(null)
  const [dateRange, setDateRange] = useState('')  // 用來顯示日期區間
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [violationList, setViolationList] = useState([])
  const [selectedManagerId, setSelectedManagerId] = useState(null)
  const [playerDetailsModalOpen, setPlayerDetailsModalOpen] = useState(false)
  const [playerDetailsData, setPlayerDetailsData] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  const batterKeys = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
  const pitcherKeys = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
  const pointKeys = [
    ...batterKeys.map(k => `b_${k}`),
    ...pitcherKeys.map(k => `p_${k}`)
  ]
  

  useEffect(() => {
    const fetchDefaultWeek = async () => {
      try {
        const res = await fetch('/api/getCurrentWeek')
        if (!res.ok) return
        const { week, start, end } = await res.json()
        setWeek(week)
        setDateRange(`${start} ~ ${end}`)
      } catch (err) {
        console.error('❌ 取得本週週次失敗:', err)
      }
    }
    fetchDefaultWeek()
  }, [])

  useEffect(() => {
    if (!week) return  // ✅ 還沒抓到週次時不查
    const fetchData = async () => {
      setLoading(true)
      try {
        // 撈該週的數據
        const res = await fetch('/api/weekly_stats_by_manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week })
        })
        const result = await res.json()
  
        // 排名處理：依照 fantasyPoints.Total 排序
        result.sort((a, b) => parseFloat(b.fantasyPoints?.Total || '0') - parseFloat(a.fantasyPoints?.Total || '0'))
        result.forEach((r, i) => r.rank = i + 1)
        // 👉 Console 後端傳來的每隊 fantasyPoints
        result.forEach((r) => {
          if (r.fantasyPoints) {
            Object.entries(r.fantasyPoints).forEach(([k, v]) => {
              console.log('team:', r.team_name, k + ':', v)
            })
          }
        })
        // 👉 直接印出 /api/weekly_stats_by_manager 回傳的資料
        console.log('weekly_stats_by_manager result:', result)
        setData(result)
  
        // 🔥 加這段：撈該週的日期區間
        const rangeRes = await fetch('/api/getCurrentWeek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week })
        })
        const { start, end } = await rangeRes.json()
        setDateRange(`${start} ~ ${end}`)
  
      } catch (err) {
        console.error('❌ fetch weekSummary 或日期區間錯誤:', err)
      }
      setLoading(false)
    }
  
    fetchData()
  }, [week])
  
  // 取得違規名單
  const fetchViolationList = async (week) => {
    const res = await fetch('/api/pitcher_violation')
    const result = await res.json()
    if (res.ok) {
      setViolationList(result.filter(v => v.week === week))
      // 比對結果印出到 console
      console.log('本週違規名單:', result.filter(v => v.week === week))
    }
  }

  // 獲取玩家詳細數據
  const fetchPlayerDetails = async (managerId) => {
    if (!week) return
    
    setLoadingDetails(true)
    try {
      // 顯示"正在載入"提示
      console.log(`正在載入 ${managerId} 的球員詳細數據...`)
      
      const res = await fetch('/api/weekly_stats_by_manager/matchup_total', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week })
      })
      
      if (!res.ok) {
        throw new Error('獲取詳細數據失敗')
      }
      
      const result = await res.json()
      const managerData = result.find(item => item.manager_id === managerId)
      
      if (managerData) {
        setPlayerDetailsData(managerData)
        setPlayerDetailsModalOpen(true)
      } else {
        console.error('找不到該玩家的詳細數據')
        alert('找不到該玩家的詳細數據，請重試或聯絡管理員。')
      }
    } catch (err) {
      console.error('❌ 獲取詳細數據錯誤:', err)
      alert('獲取數據時發生錯誤，請重試或聯絡管理員。')
    } finally {
      setTimeout(() => {
        setLoadingDetails(false)
      }, 300) // 添加短暫延遲，確保UI反應更流暢
    }
  }

  useEffect(() => {
    if (!week) return
    fetchViolationList(week)
  }, [week])

  const renderScoreTable = () => (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#0155A0] mb-2">Fantasy Points</h2>
      <div className="overflow-x-auto">
      <table className="table-auto border w-full text-sm">
        <thead>
            <tr className="bg-gray-200">
                <th className="border px-3 py-2 text-center">Rank</th>
                <th className="border px-3 py-2 text-left">Team</th>
                {pointKeys.map((key) => (
                  <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">
                    {key.slice(2)}  {/* 拿掉 b_ / p_ 前綴，只顯示像 K、BB、OPS 等 */}
                  </th>
                ))}
                <th className="border px-3 py-2 text-center">Total</th>
            </tr>
        </thead>
        <tbody>
            {data.map((d) => (
                <tr key={d.team_name} className="text-sm">
                <td className="border px-3 py-2 text-center font-bold text-[#0155A0]">{d.rank}</td>
                <td 
                  onClick={() => {
                    if (!loadingDetails) {
                      setSelectedManagerId(d.manager_id)
                      fetchPlayerDetails(d.manager_id)
                    }
                  }}
                  className={`font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap ${!loadingDetails ? "cursor-pointer hover:bg-blue-100 hover:text-blue-600" : "opacity-70"}`}
                  title={loadingDetails ? "資料載入中..." : "點擊查看球員詳細數據"}
                >
                  {d.team_name} {loadingDetails && d.manager_id === selectedManagerId && <span className="inline-block ml-1 text-blue-600">載入中...</span>}
                </td>
                {pointKeys.map((key) => {
                  const value = key.startsWith('b_')
                    ? d.batters?.fantasyPoints?.[key.slice(2)] ?? '0.0'
                    : d.pitchers?.fantasyPoints?.[key.slice(2)] ?? '0.0'

                  return (
                    <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                      {value}
                    </td>
                  )
                })}

                <td className="border px-3 py-2 text-center font-bold">{d.fantasyPoints?.Total || '0.0'}</td>
                </tr>
            ))}
        </tbody>
      </table>
      </div>
    </div>
  )

  const renderStatTable = (title, keys, type) => (
    <div>
      <h2 className="text-base font-bold text-[#0155A0] mb-2">{title} Total</h2>
      <div className="overflow-x-auto">
      <table className="table-auto border w-full text-sm">
        <thead>
            <tr className="bg-gray-200">
                <th className="border px-3 py-2 text-center">Rank</th>
                <th className="border px-3 py-2 text-left">Team</th>
                {keys.map((key) => (
                <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">{key}</th>
                ))}
            </tr>
        </thead>
        <tbody>
            {data.map((d) => {
              // 判斷是否違規
              const isViolated = violationList.some(v => v.manager_id === d.manager_id)
              return (
                <tr key={d.team_name} className="text-sm">
                <td className="border px-3 py-2 text-center font-bold text-[#0155A0]">{d.rank}</td>
                <td 
                  onClick={() => {
                    if (!loadingDetails) {
                      setSelectedManagerId(d.manager_id)
                      fetchPlayerDetails(d.manager_id)
                    }
                  }}
                  className={`font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap ${!loadingDetails ? "cursor-pointer hover:bg-blue-100 hover:text-blue-600" : "opacity-70"}`}
                  title={loadingDetails ? "資料載入中..." : "點擊查看球員詳細數據"}
                >
                  {d.team_name} {loadingDetails && d.manager_id === selectedManagerId && <span className="inline-block ml-1 text-blue-600">載入中...</span>}
                </td>
                {keys.map((key) => {
                  // 投手IP欄位且違規才標紅
                  const highlight = type === 'pitchers' && key === 'IP' && isViolated
                  return (
                    <td key={key} className={`border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap ${highlight ? 'bg-red-600 text-white' : ''}`}>{d[type][key]}</td>
                  )
                })}
                </tr>
              )
            })}
        </tbody>

      </table>
      </div>
    </div>
  )

  // 渲染球員詳細數據模態框
  const renderPlayerDetailsModal = () => {
    if (!playerDetailsModalOpen || !playerDetailsData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 p-4 flex justify-between items-center border-b z-10">
            <h2 className="text-xl font-bold">
              {playerDetailsData.team_name} 球員週累計數據
              {loadingDetails && <span className="ml-3 text-sm text-blue-600 animate-pulse">資料更新中...</span>}
            </h2>
            <button 
              onClick={() => {
                if (!loadingDetails) {
                  setPlayerDetailsModalOpen(false)
                }
              }}
              disabled={loadingDetails}
              className={`text-gray-700 hover:text-gray-900 text-2xl ${loadingDetails ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              &times;
            </button>
          </div>
          
          <div className="p-4">
            {loadingDetails ? (
              <div className="flex justify-center items-center p-8">
                <p className="text-blue-600">載入中...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 打者資料 */}
                <div>
                  <h3 className="text-lg font-bold text-[#0155A0] mb-2">打者週累計數據</h3>
                  <p className="text-sm text-gray-600 mb-2">以下為每位球員本週累計數據（僅計算球員被排入先發陣容的數據）</p>
                  {playerDetailsData.batterRows && playerDetailsData.batterRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {['Name', 'AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map(key => (
                              <th key={key} className="border px-2 py-2 text-center">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {playerDetailsData.batterRows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {['Name', 'AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map((key, j) => (
                                <td key={j} className="border px-2 py-1 text-center whitespace-nowrap">{row[key]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">無打者資料</p>
                  )}
                </div>

                {/* 投手資料 */}
                <div>
                  <h3 className="text-lg font-bold text-[#0155A0] mb-2">投手週累計數據</h3>
                  <p className="text-sm text-gray-600 mb-2">以下為每位投手本週累計數據（僅計算球員被排入先發陣容的數據）</p>
                  {playerDetailsData.pitcherRows && playerDetailsData.pitcherRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {['Name', 'IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map(key => (
                              <th key={key} className="border px-2 py-2 text-center">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {playerDetailsData.pitcherRows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {['Name', 'IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map((key, j) => (
                                <td key={j} className="border px-2 py-1 text-center whitespace-nowrap">{row[key]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">無投手資料</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-100 p-4 border-t sticky bottom-0">
            <button 
              onClick={() => {
                if (!loadingDetails) {
                  setPlayerDetailsModalOpen(false)
                }
              }}
              disabled={loadingDetails}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${loadingDetails ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">MATCHUP</h1>

      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-semibold">Select Week:</label>
        <select
          value={week ?? ''}
          onChange={(e) => setWeek(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="" disabled>週次</option> {/* 初始提示 */}
          {weeks.map(w => <option key={w}>{w}</option>)}
        </select>


        {dateRange && (
            <p className="mt-1 text-sm text-gray-500">本週日期：{dateRange}</p>
        )}
      </div>

      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto space-y-12">
          {renderScoreTable()}
          {renderStatTable('Batters', ['AB', ...batterKeys], 'batters')}
          {renderStatTable('Pitchers', ['IP', ...pitcherKeys], 'pitchers')}
        </div>
      )}

      {/* 渲染球員詳細數據模態框 */}
      {renderPlayerDetailsModal()}
    </div>
  )
}
