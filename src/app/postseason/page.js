'use client'

import { useEffect, useState } from 'react'

export default function PostseasonTable() {
  const [matchups, setMatchups] = useState([])
  const [selectedMatchup, setSelectedMatchup] = useState(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState(null)
  const [selectedTeamName, setSelectedTeamName] = useState(null)
  const [playerDetailsModalOpen, setPlayerDetailsModalOpen] = useState(false)
  const [playerDetailsData, setPlayerDetailsData] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('matchup') // 'matchup' 或 'today'
  const [todayData, setTodayData] = useState(null)
  const [loadingTodayData, setLoadingTodayData] = useState(false)

  const batterKeys = ['R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS']
  const pitcherKeys = ['W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP']
  const pointKeys = [
    ...batterKeys.map(k => `b_${k}`),
    ...pitcherKeys.map(k => `p_${k}`)
  ]

  // 載入所有季後賽賽程
  useEffect(() => {
    const fetchMatchups = async () => {
      try {
        const res = await fetch('/api/postseason_schedule')
        if (!res.ok) return
        const result = await res.json()
        setMatchups(result)
        
        // 根據當前日期選擇對應的賽程
        if (result.length > 0) {
          const today = new Date()
          today.setHours(0, 0, 0, 0) // 設定為當天的開始時間
          
          let selectedMatchup = null
          
          // 按照開始日期排序賽程
          const sortedMatchups = result.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          
          for (let matchup of sortedMatchups) {
            const startDate = new Date(matchup.start_date)
            const endDate = new Date(matchup.end_date)
            startDate.setHours(0, 0, 0, 0)
            endDate.setHours(23, 59, 59, 999)
            
            // 如果當前日期在這個賽程期間內
            if (today >= startDate && today <= endDate) {
              selectedMatchup = matchup
              break
            }
          }
          
          // 如果沒有找到對應的賽程，則根據日期選擇最適合的
          if (!selectedMatchup) {
            const firstMatchup = sortedMatchups[0]
            const lastMatchup = sortedMatchups[sortedMatchups.length - 1]
            
            const firstStartDate = new Date(firstMatchup.start_date)
            const lastEndDate = new Date(lastMatchup.end_date)
            firstStartDate.setHours(0, 0, 0, 0)
            lastEndDate.setHours(23, 59, 59, 999)
            
            if (today < firstStartDate) {
              // 早於最早周次，選擇最早的
              selectedMatchup = firstMatchup
            } else if (today > lastEndDate) {
              // 晚於最晚周次，選擇最晚的
              selectedMatchup = lastMatchup
            } else {
              // 在範圍內但沒有找到確切匹配，選擇最接近的
              let closestMatchup = firstMatchup
              let minDistance = Math.abs(today - new Date(firstMatchup.start_date))
              
              for (let matchup of sortedMatchups) {
                const matchupStartDate = new Date(matchup.start_date)
                const distance = Math.abs(today - matchupStartDate)
                if (distance < minDistance) {
                  minDistance = distance
                  closestMatchup = matchup
                }
              }
              selectedMatchup = closestMatchup
            }
          }
          
          setSelectedMatchup(selectedMatchup)
        }
      } catch (err) {
        console.error('❌ 取得季後賽賽程失敗:', err)
      }
    }
    fetchMatchups()
  }, [])

  // 取得選定賽程的數據
  useEffect(() => {
    if (!selectedMatchup) return
    
    const fetchMatchupData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/postseason_stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            matchupId: selectedMatchup.id,
            team1: selectedMatchup.team1,
            team2: selectedMatchup.team2,
            startDate: selectedMatchup.start_date,
            endDate: selectedMatchup.end_date
          })
        })
        const result = await res.json()
        
        console.log('季後賽數據:', result)
        setData(result)
        
      } catch (err) {
        console.error('❌ 取得季後賽數據失敗:', err)
      }
      setLoading(false)
    }

    fetchMatchupData()
  }, [selectedMatchup])

  // 獲取玩家詳細數據
  const fetchPlayerDetails = async (managerId) => {
    if (!selectedMatchup) return
    
    setLoadingDetails(true)
    try {
      console.log(`正在載入 ${managerId} 的球員詳細數據...`)
      
      const res = await fetch('/api/postseason_stats/player_details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          managerId,
          startDate: selectedMatchup.start_date,
          endDate: selectedMatchup.end_date
        })
      })
      
      if (!res.ok) {
        throw new Error('獲取詳細數據失敗')
      }
      
      const managerData = await res.json()
      
      if (managerData) {
        setPlayerDetailsData(managerData)
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
      }, 300)
    }
  }

  // 獲取今日球員數據
  const fetchTodayPlayerDetails = async (managerId) => {
    if (!selectedMatchup) return
    
    setLoadingTodayData(true)
    try {
      console.log(`正在載入 ${managerId} 的今日球員數據...`)
      
      // 使用今天的日期
      const today = new Date().toISOString().split('T')[0]
      
      const res = await fetch('/api/postseason_stats/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          managerId,
          date: today
        })
      })
      
      if (!res.ok) {
        throw new Error('獲取今日數據失敗')
      }
      
      const todayPlayerData = await res.json()
      
      if (todayPlayerData) {
        setTodayData(todayPlayerData)
      } else {
        console.error('找不到該玩家的今日數據')
        alert('找不到該玩家的今日數據，請重試或聯絡管理員。')
      }
    } catch (err) {
      console.error('❌ 獲取今日數據錯誤:', err)
      alert('獲取今日數據時發生錯誤，請重試或聯絡管理員。')
    } finally {
      setTimeout(() => {
        setLoadingTodayData(false)
      }, 300)
    }
  }

  // 當數據載入完成後自動選擇第一個有效的玩家
  useEffect(() => {
    if (data && data.length > 0 && !selectedManagerId) {
      const defaultPlayer = data[0].team_name ? data[0] : (data[1]?.team_name ? data[1] : data[0]);
      setSelectedManagerId(defaultPlayer.manager_id)
      setSelectedTeamName(defaultPlayer.team_name || 'TBD')
      if (defaultPlayer.manager_id) {
        fetchPlayerDetails(defaultPlayer.manager_id)
        fetchTodayPlayerDetails(defaultPlayer.manager_id)
      }
    }
  }, [data, selectedManagerId])

  const renderScoreTable = () => {
    // 移除 Fantasy Points 表格，改為在上方顯示大比數
    return null;
  }

  const renderCombinedStatTable = () => {
    if (data.length !== 2) return null;
    
    const team1 = data[0];
    const team2 = data[1];
    
    // 合併打者和投手統計項目
    const batterKeys = ['AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'];
    const pitcherKeys = ['IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'];
    
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <tbody>
              {/* Batters Total 標題行 */}
              <tr className="bg-gray-200">
                <td colSpan="3" className="py-2 px-4 text-sm font-bold text-gray-700 bg-gray-300">
                  Batters Total
                </td>
              </tr>
              
              {/* 打者統計 */}
              {batterKeys.map((key, index) => {
                const team1Value = parseFloat(team1.batters[key]) || 0;
                const team2Value = parseFloat(team2.batters[key]) || 0;
                
                let team1Better, team2Better;
                if (key === 'K' || key === 'GIDP') {
                  // 數值越低越好
                  team1Better = team1Value < team2Value && team1Value !== team2Value;
                  team2Better = team2Value < team1Value && team1Value !== team2Value;
                } else {
                  // 數值越高越好
                  team1Better = team1Value > team2Value && team1Value !== team2Value;
                  team2Better = team2Value > team1Value && team1Value !== team2Value;
                }
                
                return (
                  <tr key={`batters-${key}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className={`py-2 px-4 text-lg font-semibold w-1/3 ${team1Better ? 'bg-blue-100 font-bold' : ''}`}>
                      {team1.batters[key]}
                    </td>
                    <td className="py-2 px-4 text-sm font-bold text-gray-600 bg-gray-100 w-1/3">
                      {key}
                    </td>
                    <td className={`py-2 px-4 text-lg font-semibold w-1/3 ${team2Better ? 'bg-blue-100 font-bold' : ''}`}>
                      {team2.batters[key]}
                    </td>
                  </tr>
                );
              })}
              
              {/* Pitchers Total 標題行 */}
              <tr className="bg-gray-200">
                <td colSpan="3" className="py-2 px-4 text-sm font-bold text-gray-700 bg-gray-300">
                  Pitchers Total
                </td>
              </tr>
              
              {/* 投手統計 */}
              {pitcherKeys.map((key, index) => {
                const team1Value = parseFloat(team1.pitchers[key]) || 0;
                const team2Value = parseFloat(team2.pitchers[key]) || 0;
                
                let team1Better, team2Better;
                if (['L', 'H', 'ER', 'BB', 'ERA', 'WHIP'].includes(key)) {
                  // 數值越低越好
                  team1Better = team1Value < team2Value && team1Value !== team2Value;
                  team2Better = team2Value < team1Value && team1Value !== team2Value;
                } else {
                  // 數值越高越好
                  team1Better = team1Value > team2Value && team1Value !== team2Value;
                  team2Better = team2Value > team1Value && team1Value !== team2Value;
                }
                
                return (
                  <tr key={`pitchers-${key}`} className={(index + batterKeys.length + 1) % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className={`py-2 px-4 text-lg font-semibold w-1/3 ${team1Better ? 'bg-blue-100 font-bold' : ''}`}>
                      {team1.pitchers[key]}
                    </td>
                    <td className="py-2 px-4 text-sm font-bold text-gray-600 bg-gray-100 w-1/3">
                      {key}
                    </td>
                    <td className={`py-2 px-4 text-lg font-semibold w-1/3 ${team2Better ? 'bg-blue-100 font-bold' : ''}`}>
                      {team2.pitchers[key]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const renderStatTable = (title, keys, type) => {
    if (data.length !== 2) return null;
    
    const team1 = data[0];
    const team2 = data[1];
    
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-center mb-4">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead>
              <tr>
                <th className="text-xl font-bold text-[#0155A0] pb-4 w-1/3">
                  {team1.team_name || 'TBD'}
                </th>
                <th className="pb-4 w-1/3"></th>
                <th className="text-xl font-bold text-[#0155A0] pb-4 w-1/3">
                  {team2.team_name || 'TBD'}
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key, index) => {
                const team1Value = parseFloat(team1[type][key]) || 0;
                const team2Value = parseFloat(team2[type][key]) || 0;
                
                let team1Better, team2Better;
                if ((key === 'K' && type === 'batters') || 
                    (key === 'GIDP' && type === 'batters') ||
                    (['L', 'H', 'ER', 'BB', 'ERA', 'WHIP'].includes(key) && type === 'pitchers')) {
                  // 數值越低越好
                  team1Better = team1Value < team2Value && team1Value !== team2Value;
                  team2Better = team2Value < team1Value && team1Value !== team2Value;
                } else {
                  // 數值越高越好
                  team1Better = team1Value > team2Value && team1Value !== team2Value;
                  team2Better = team2Value > team1Value && team1Value !== team2Value;
                }
                
                return (
                  <tr key={key} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td 
                      onClick={() => {
                        if (!loadingDetails && team1.manager_id) {
                          setSelectedManagerId(team1.manager_id)
                          setSelectedTeamName(team1.team_name)
                          fetchPlayerDetails(team1.manager_id)
                        }
                      }}
                      className={`py-3 px-4 text-lg font-semibold ${team1Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team1.manager_id ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team1.manager_id ? "點擊查看球員詳細數據" : ""}
                    >
                      {team1[type][key]}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-600 bg-gray-100">
                      {key}
                    </td>
                    <td 
                      onClick={() => {
                        if (!loadingDetails && team2.manager_id) {
                          setSelectedManagerId(team2.manager_id)
                          setSelectedTeamName(team2.team_name)
                          fetchPlayerDetails(team2.manager_id)
                        }
                      }}
                      className={`py-3 px-4 text-lg font-semibold ${team2Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team2.manager_id ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team2.manager_id ? "點擊查看球員詳細數據" : ""}
                    >
                      {team2[type][key]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 渲染球員詳細數據模態框
  const renderPlayerDetailsModal = () => {
    if (!playerDetailsModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 p-4 border-b z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                球員詳細數據
                {(loadingDetails || loadingTodayData) && <span className="ml-3 text-sm text-blue-600 animate-pulse">資料更新中...</span>}
              </h2>
              <button 
                onClick={() => {
                  if (!loadingDetails && !loadingTodayData) {
                    setPlayerDetailsModalOpen(false)
                  }
                }}
                disabled={loadingDetails || loadingTodayData}
                className={`text-gray-700 hover:text-gray-900 text-2xl ${(loadingDetails || loadingTodayData) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                &times;
              </button>
            </div>
            
            {/* Data Type Tab 選擇器 (Matchup Total vs Today's Stats) */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setActiveTab('matchup')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'matchup' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Matchup Total
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'today' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Today&apos;s Stats
              </button>
            </div>
            
            {/* Team Tab 選擇器 */}
            <div className="flex space-x-4">
              {data.map((team, index) => {
                const teamName = team.team_name || 'TBD';
                const isDisabled = !team.team_name || !team.manager_id;
                const isActive = selectedManagerId === team.manager_id;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isDisabled && !loadingDetails && !loadingTodayData) {
                        setSelectedManagerId(team.manager_id)
                        setSelectedTeamName(teamName)
                        fetchPlayerDetails(team.manager_id)
                        fetchTodayPlayerDetails(team.manager_id)
                      }
                    }}
                    disabled={isDisabled || loadingDetails || loadingTodayData}
                    className={`px-4 py-2 rounded-t-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : isDisabled 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    {teamName}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-4">
            {activeTab === 'matchup' ? (
              // Matchup Total 內容
              loadingDetails ? (
                <div className="flex justify-center items-center p-8">
                  <p className="text-blue-600">載入中...</p>
                </div>
              ) : playerDetailsData ? (
                <div className="space-y-8">
                  {/* 打者資料 */}
                  <div>
                    <h3 className="text-lg font-bold text-[#0155A0] mb-2">打者累計數據</h3>
                    <p className="text-sm text-gray-600 mb-2">以下為每位球員在此賽程期間的累計數據（僅計算球員被排入先發陣容的數據）</p>
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
                    <h3 className="text-lg font-bold text-[#0155A0] mb-2">投手累計數據</h3>
                    <p className="text-sm text-gray-600 mb-2">以下為每位投手在此賽程期間的累計數據（僅計算球員被排入先發陣容的數據）</p>
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
              ) : (
                <div className="flex justify-center items-center p-8">
                  <p className="text-gray-500">請選擇一個有效的隊伍查看球員數據</p>
                </div>
              )
            ) : (
              // Today's Stats 內容
              loadingTodayData ? (
                <div className="flex justify-center items-center p-8">
                  <p className="text-blue-600">載入今日數據中...</p>
                </div>
              ) : todayData ? (
                <div className="space-y-8">
                  {/* 今日打者資料 */}
                  <div>
                    <h3 className="text-lg font-bold text-[#0155A0] mb-2">今日打者數據</h3>
                    <p className="text-sm text-gray-600 mb-2">以下為每位球員今日的數據（僅計算球員被排入先發陣容的數據）</p>
                    {todayData.batterRows && todayData.batterRows.length > 0 ? (
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
                            {todayData.batterRows.map((row, i) => (
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
                      <p className="text-gray-500">今日無打者資料</p>
                    )}
                  </div>

                  {/* 今日投手資料 */}
                  <div>
                    <h3 className="text-lg font-bold text-[#0155A0] mb-2">今日投手數據</h3>
                    <p className="text-sm text-gray-600 mb-2">以下為每位投手今日的數據（僅計算球員被排入先發陣容的數據）</p>
                    {todayData.pitcherRows && todayData.pitcherRows.length > 0 ? (
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
                            {todayData.pitcherRows.map((row, i) => (
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
                      <p className="text-gray-500">今日無投手資料</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center p-8">
                  <p className="text-gray-500">今日無可用數據</p>
                </div>
              )
            )}
          </div>
          
          <div className="bg-gray-100 p-4 border-t sticky bottom-0">
            <button 
              onClick={() => {
                if (!loadingDetails && !loadingTodayData) {
                  setPlayerDetailsModalOpen(false)
                }
              }}
              disabled={loadingDetails || loadingTodayData}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(loadingDetails || loadingTodayData) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      <h1 className="text-2xl font-bold mb-6">POSTSEASON</h1>

      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-semibold">選擇賽程:</label>
        <select
          value={selectedMatchup?.id || ''}
          onChange={(e) => {
            const matchup = matchups.find(m => m.id === e.target.value)
            setSelectedMatchup(matchup)
          }}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="" disabled>請選擇賽程</option>
          {matchups.map(m => (
            <option key={m.id} value={m.id}>
              {m.stage} {m.stage_game}
            </option>
          ))}
        </select>
        
        {selectedMatchup && (
          <span className="text-sm text-gray-600">
            ({new Date(selectedMatchup.start_date).toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'})} ~ {new Date(selectedMatchup.end_date).toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'})})
          </span>
        )}
      </div>

      {loading && <div className="text-blue-600 font-semibold">Loading...</div>}

      {!loading && data.length > 0 && (
        <div className="space-y-8">
          {/* 球隊名稱和總分在最上面 */}
          <div className="text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="text-center flex-shrink-0">
                <div className="text-lg md:text-2xl font-bold text-[#0155A0] whitespace-nowrap text-ellipsis overflow-hidden max-w-[120px] md:max-w-none">
                  {data[0].team_name || 'TBD'}
                </div>
              </div>
              <div className="mx-4 md:mx-8 flex items-center justify-center">
                <div className="text-4xl font-bold text-right" style={{minWidth: '60px'}}>
                  {data[0].fantasyPoints?.Total || '0'}
                </div>
                <div className="text-2xl font-bold text-gray-400 mx-3">/</div>
                <div className="text-4xl font-bold text-left" style={{minWidth: '60px'}}>
                  {data[1].fantasyPoints?.Total || '0'}
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-lg md:text-2xl font-bold text-[#0155A0] whitespace-nowrap text-ellipsis overflow-hidden max-w-[120px] md:max-w-none">
                  {data[1].team_name || 'TBD'}
                </div>
              </div>
            </div>
          </div>
          
          {/* 統合的數據表格 */}
          {renderCombinedStatTable()}
          
          {/* 球員詳細數據區域 */}
          <div className="mt-8">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Matchup Totals - 球員詳細數據
                  {loadingDetails && <span className="ml-3 text-sm text-blue-600 animate-pulse">資料更新中...</span>}
                </h2>
              </div>
              
              {/* Tab 選擇器 */}
              <div className="flex space-x-4 mb-6">
                {data.map((team, index) => {
                  const teamName = team.team_name || 'TBD';
                  const isDisabled = !team.team_name || !team.manager_id;
                  const isActive = selectedManagerId === team.manager_id;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (!isDisabled && !loadingDetails) {
                          setSelectedManagerId(team.manager_id)
                          setSelectedTeamName(teamName)
                          fetchPlayerDetails(team.manager_id)
                        }
                      }}
                      disabled={isDisabled || loadingDetails}
                      className={`px-4 py-2 rounded-t-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-500 text-white' 
                          : isDisabled 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {teamName}
                    </button>
                  );
                })}
              </div>
              
              {/* 球員詳細數據內容 */}
              <div className="bg-white rounded-lg p-4">
                {loadingDetails ? (
                  <div className="flex justify-center items-center p-8">
                    <p className="text-blue-600">載入中...</p>
                  </div>
                ) : playerDetailsData ? (
                  <div className="space-y-8">
                    {/* 打者資料 */}
                    <div>
                      <h3 className="text-lg font-bold text-[#0155A0] mb-2">打者累計數據</h3>
                      <p className="text-sm text-gray-600 mb-2">以下為每位球員在此賽程期間的累計數據（僅計算球員被排入先發陣容的數據）</p>
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
                      <h3 className="text-lg font-bold text-[#0155A0] mb-2">投手累計數據</h3>
                      <p className="text-sm text-gray-600 mb-2">以下為每位投手在此賽程期間的累計數據（僅計算球員被排入先發陣容的數據）</p>
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
                ) : (
                  <div className="flex justify-center items-center p-8">
                    <p className="text-gray-500">請選擇一個有效的隊伍查看球員數據</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 渲染球員詳細數據模態框 */}
      {renderPlayerDetailsModal()}
    </div>
  )
}
