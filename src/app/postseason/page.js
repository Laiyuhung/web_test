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
  const [missedData, setMissedData] = useState(null)
  const [loadingMissedData, setLoadingMissedData] = useState(false)
  const [activeTab, setActiveTab] = useState('matchup') // 'matchup' 或 'today'
  const [todayData, setTodayData] = useState(null)
  const [loadingTodayData, setLoadingTodayData] = useState(false)
  const [viewMode, setViewMode] = useState('mobile') // 'mobile' 或 'desktop'

  // 監測螢幕尺寸變化以判斷顯示模式
  useEffect(() => {
    const checkViewMode = () => {
      const isDesktop = window.innerWidth >= 1024 // lg breakpoint
      const newViewMode = isDesktop ? 'desktop' : 'mobile'
      setViewMode(newViewMode)
      console.log(`📱💻 記分板顯示模式: ${newViewMode === 'desktop' ? '電腦版 (橫向佈局)' : '手機版 (直向佈局)'} - 螢幕寬度: ${window.innerWidth}px`)
    }

    // 初始檢查
    checkViewMode()

    // 監聽螢幕尺寸變化
    window.addEventListener('resize', checkViewMode)

    // 清理事件監聽器
    return () => window.removeEventListener('resize', checkViewMode)
  }, [])

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

  // 獲取錯失數據
  const fetchMissedData = async (managerId) => {
    if (!selectedMatchup) return
    
    // 清空之前的錯失數據
    setMissedData(null)
    setLoadingMissedData(true)
    try {
      console.log(`🔍 正在載入 ${managerId} 的錯失數據分析...`)
      
      const res = await fetch('/api/postseason_stats/missed_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          managerId,
          startDate: selectedMatchup.start_date,
          endDate: selectedMatchup.end_date
        })
      })
      
      if (!res.ok) {
        throw new Error('獲取錯失數據失敗')
      }
      
      const missedDataResult = await res.json()
      
      if (missedDataResult) {
        setMissedData(missedDataResult)
        console.log(`✅ 成功載入錯失數據: ${missedDataResult.summary?.totalMissedBatters || 0} 位打者, ${missedDataResult.summary?.totalMissedPitchers || 0} 位投手`)
      } else {
        console.error('找不到該玩家的錯失數據')
        alert('找不到該玩家的錯失數據，請重試或聯絡管理員。')
      }
    } catch (err) {
      console.error('❌ 獲取錯失數據錯誤:', err)
      alert('獲取錯失數據時發生錯誤，請重試或聯絡管理員。')
    } finally {
      setTimeout(() => {
        setLoadingMissedData(false)
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
        fetchMissedData(defaultPlayer.manager_id)
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
    
    // 手機版（直向）表格
    const renderMobileTable = () => {
      // console.log('📱 渲染手機版記分板 (直向佈局)')
      return (
        <div className="lg:hidden">
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
                  // AB 不屬於比較項目，不亮燈
                  if (key === 'AB') {
                    team1Better = false;
                    team2Better = false;
                  } else if (key === 'K' || key === 'GIDP') {
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
                  // IP 不屬於比較項目，不亮燈
                  if (key === 'IP') {
                    team1Better = false;
                    team2Better = false;
                  } else if (['L', 'H', 'ER', 'BB', 'ERA', 'WHIP'].includes(key)) {
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
    };

    // 電腦版（橫向）表格
    const renderDesktopTable = () => {
      // console.log('💻 渲染電腦版記分板 (橫向佈局)')
      return (
        <div className="hidden lg:block">
          {/* 打者統計表 */}
          <div className="mb-6">
            <div className="bg-gray-300 py-2 px-4 text-center text-sm font-bold text-gray-700 mb-2">
              Batters Total
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-2 text-base font-bold text-gray-600 border">Team</th>
                    {batterKeys.map(key => (
                      <th key={key} className="py-2 px-2 text-sm font-bold text-gray-600 border">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 第一隊打者數據 */}
                  <tr className="bg-white">
                    <td className="py-2 px-2 text-base font-bold text-[#0155A0] border">
                      {team1.team_name || 'TBD'}
                    </td>
                    {batterKeys.map(key => {
                      const team1Value = parseFloat(team1.batters[key]) || 0;
                      const team2Value = parseFloat(team2.batters[key]) || 0;
                      
                      let team1Better;
                      // AB 不屬於比較項目，不亮燈
                      if (key === 'AB') {
                        team1Better = false;
                      } else if (key === 'K' || key === 'GIDP') {
                        // 數值越低越好
                        team1Better = team1Value < team2Value && team1Value !== team2Value;
                      } else {
                        // 數值越高越好
                        team1Better = team1Value > team2Value && team1Value !== team2Value;
                      }
                      
                      return (
                        <td key={key} className={`py-2 px-2 text-sm font-semibold border ${team1Better ? 'bg-blue-100 font-bold' : ''}`}>
                          {team1.batters[key]}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* 第二隊打者數據 */}
                  <tr className="bg-gray-50">
                    <td className="py-2 px-2 text-base font-bold text-[#0155A0] border">
                      {team2.team_name || 'TBD'}
                    </td>
                    {batterKeys.map(key => {
                      const team1Value = parseFloat(team1.batters[key]) || 0;
                      const team2Value = parseFloat(team2.batters[key]) || 0;
                      
                      let team2Better;
                      // AB 不屬於比較項目，不亮燈
                      if (key === 'AB') {
                        team2Better = false;
                      } else if (key === 'K' || key === 'GIDP') {
                        // 數值越低越好
                        team2Better = team2Value < team1Value && team1Value !== team2Value;
                      } else {
                        // 數值越高越好
                        team2Better = team2Value > team1Value && team1Value !== team2Value;
                      }
                      
                      return (
                        <td key={key} className={`py-2 px-2 text-sm font-semibold border ${team2Better ? 'bg-blue-100 font-bold' : ''}`}>
                          {team2.batters[key]}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 投手統計表 */}
          <div>
            <div className="bg-gray-300 py-2 px-4 text-center text-sm font-bold text-gray-700 mb-2">
              Pitchers Total
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-2 text-base font-bold text-gray-600 border">Team</th>
                    {pitcherKeys.map(key => (
                      <th key={key} className="py-2 px-2 text-sm font-bold text-gray-600 border">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 第一隊投手數據 */}
                  <tr className="bg-white">
                    <td className="py-2 px-2 text-base font-bold text-[#0155A0] border">
                      {team1.team_name || 'TBD'}
                    </td>
                    {pitcherKeys.map(key => {
                      const team1Value = parseFloat(team1.pitchers[key]) || 0;
                      const team2Value = parseFloat(team2.pitchers[key]) || 0;
                      
                      let team1Better;
                      // IP 不屬於比較項目，不亮燈
                      if (key === 'IP') {
                        team1Better = false;
                      } else if (['L', 'H', 'ER', 'BB', 'ERA', 'WHIP'].includes(key)) {
                        // 數值越低越好
                        team1Better = team1Value < team2Value && team1Value !== team2Value;
                      } else {
                        // 數值越高越好
                        team1Better = team1Value > team2Value && team1Value !== team2Value;
                      }
                      
                      return (
                        <td key={key} className={`py-2 px-2 text-sm font-semibold border ${team1Better ? 'bg-blue-100 font-bold' : ''}`}>
                          {team1.pitchers[key]}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* 第二隊投手數據 */}
                  <tr className="bg-gray-50">
                    <td className="py-2 px-2 text-base font-bold text-[#0155A0] border">
                      {team2.team_name || 'TBD'}
                    </td>
                    {pitcherKeys.map(key => {
                      const team1Value = parseFloat(team1.pitchers[key]) || 0;
                      const team2Value = parseFloat(team2.pitchers[key]) || 0;
                      
                      let team2Better;
                      // IP 不屬於比較項目，不亮燈
                      if (key === 'IP') {
                        team2Better = false;
                      } else if (['L', 'H', 'ER', 'BB', 'ERA', 'WHIP'].includes(key)) {
                        // 數值越低越好
                        team2Better = team2Value < team1Value && team1Value !== team2Value;
                      } else {
                        // 數值越高越好
                        team2Better = team2Value > team1Value && team1Value !== team2Value;
                      }
                      
                      return (
                        <td key={key} className={`py-2 px-2 text-sm font-semibold border ${team2Better ? 'bg-blue-100 font-bold' : ''}`}>
                          {team2.pitchers[key]}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };
    
    return (
      <div>
        {/* Debug info */}
        {/* {console.log(`🔍 記分板元件渲染 - 當前視窗模式: ${viewMode} (螢幕寬度: ${typeof window !== 'undefined' ? window.innerWidth : 'SSR'}px)`)} */}
        {renderMobileTable()}
        {renderDesktopTable()}
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
                // AB、IP 不屬於比較項目，不亮燈
                if ((key === 'AB' && type === 'batters') || (key === 'IP' && type === 'pitchers')) {
                  team1Better = false;
                  team2Better = false;
                } else if ((key === 'K' && type === 'batters') || 
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
                        if (!loadingDetails && team1.manager_id && !loadingMissedData) {
                          setSelectedManagerId(team1.manager_id)
                          setSelectedTeamName(team1.team_name)
                          fetchPlayerDetails(team1.manager_id)
                          fetchMissedData(team1.manager_id)
                        }
                      }}
                      className={`py-3 px-4 text-lg font-semibold ${team1Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team1.manager_id && !loadingMissedData ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team1.manager_id && !loadingMissedData ? "點擊查看球員詳細數據" : ""}
                    >
                      {team1[type][key]}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-600 bg-gray-100">
                      {key}
                    </td>
                    <td 
                      onClick={() => {
                        if (!loadingDetails && team2.manager_id && !loadingMissedData) {
                          setSelectedManagerId(team2.manager_id)
                          setSelectedTeamName(team2.team_name)
                          fetchPlayerDetails(team2.manager_id)
                          fetchMissedData(team2.manager_id)
                        }
                      }}
                      className={`py-3 px-4 text-lg font-semibold ${team2Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team2.manager_id && !loadingMissedData ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team2.manager_id && !loadingMissedData ? "點擊查看球員詳細數據" : ""}
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
                  if (!loadingDetails && !loadingTodayData && !loadingMissedData) {
                    setPlayerDetailsModalOpen(false)
                  }
                }}
                disabled={loadingDetails || loadingTodayData || loadingMissedData}
                className={`text-gray-700 hover:text-gray-900 text-2xl ${(loadingDetails || loadingTodayData || loadingMissedData) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                &times;
              </button>
            </div>
            
            {/* 電腦版：橫排佈局 (Data Type Tab 置左，Team Tab 靠右) */}
            <div className="hidden lg:flex lg:justify-between lg:items-center mb-4">
              {/* Data Type Tab 選擇器 (置左) */}
              <div className="flex space-x-2">
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
              
              {/* Team Tab 選擇器 (靠右) */}
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
            
            {/* 手機版：直排佈局 */}
            <div className="lg:hidden space-y-4 mb-4">
              {/* Data Type Tab 選擇器 */}
              <div className="flex space-x-2">
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

                  {/* 錯失數據分析 */}
                  <div>
                    <h3 className="text-lg font-bold text-[#0155A0] mb-2">🔍 錯失數據分析</h3>
                    {/* <p className="text-sm text-gray-600 mb-4">
                      以下顯示你的球員在該期間內沒有被排入先發陣容，但實際上有表現的數據。這些是你可能錯失的得分機會。
                    </p> */}
                    
                    {loadingMissedData ? (
                      <div className="flex justify-center items-center p-8">
                        <p className="text-blue-600 animate-pulse">載入錯失數據中...</p>
                      </div>
                    ) : !selectedManagerId ? (
                      <div className="text-center p-8">
                        <p className="text-gray-500">請點選上方隊伍標籤查看錯失數據</p>
                      </div>
                    ) : !missedData ? (
                      <div className="text-center p-8">
                        <p className="text-gray-500">載入錯失數據中...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 錯失打者數據 */}
                        {missedData.missedBatterRows && missedData.missedBatterRows.length > 0 && (
                          <div>
                            <h4 className="text-md font-bold text-[#0155A0] mb-2">錯失的打者表現</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full border text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    {['Name', 'AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map(key => (
                                      <th key={key} className="border px-2 py-2 text-center font-semibold">{key}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {missedData.missedBatterRows.map((row, i) => {
                                    const isTotal = row.Name === '總計'
                                    return (
                                      <tr key={i} className={isTotal ? 'bg-yellow-100 font-bold' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                                        {['Name', 'AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map((key, j) => (
                                          <td key={j} className={`border px-2 py-1 text-center whitespace-nowrap ${isTotal ? 'font-bold' : ''}`}>
                                            {row[key]}
                                          </td>
                                        ))}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 錯失投手數據 */}
                        {missedData.missedPitcherRows && missedData.missedPitcherRows.length > 0 && (
                          <div>
                            <h4 className="text-md font-bold text-[#0155A0] mb-2">錯失的投手表現</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full border text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    {['Name', 'IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map(key => (
                                      <th key={key} className="border px-2 py-2 text-center font-semibold">{key}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {missedData.missedPitcherRows.map((row, i) => {
                                    const isTotal = row.Name === '總計'
                                    return (
                                      <tr key={i} className={isTotal ? 'bg-yellow-100 font-bold' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                                        {['Name', 'IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map((key, j) => (
                                          <td key={j} className={`border px-2 py-1 text-center whitespace-nowrap ${isTotal ? 'font-bold' : ''}`}>
                                            {row[key]}
                                          </td>
                                        ))}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 如果沒有錯失數據 */}
                        {(!missedData.missedBatterRows || missedData.missedBatterRows.length === 0) && 
                         (!missedData.missedPitcherRows || missedData.missedPitcherRows.length === 0) && (
                          <div className="text-center p-8">
                            <p className="text-green-600 font-semibold">此玩家沒有錯失任何重要的球員表現</p>
                            <p className="text-sm text-gray-600 mt-2">所有有表現的球員都已被正確安排在先發陣容中。</p>
                          </div>
                        )}
                      </div>
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
                if (!loadingDetails && !loadingTodayData && !loadingMissedData) {
                  setPlayerDetailsModalOpen(false)
                }
              }}
              disabled={loadingDetails || loadingTodayData || loadingMissedData}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(loadingDetails || loadingTodayData || loadingMissedData) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <option value="" disabled>賽程</option>
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
                  球員詳細數據
                  {(loadingDetails || loadingTodayData || loadingMissedData) && <span className="ml-3 text-sm text-blue-600 animate-pulse">資料更新中...</span>}
                </h2>
                
                {/* 添加一個按鈕來打開模態框查看更詳細的數據 */}
                {/* <button
                  onClick={() => setPlayerDetailsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  查看詳細模態框
                </button> */}
              </div>
              
              {/* 電腦版：橫排佈局 (Data Type Tab 置左，Team Tab 靠右) */}
              <div className="hidden lg:flex lg:justify-between lg:items-center mb-6">
                {/* Data Type Tab 選擇器 (置左) */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('matchup')}
                    className={`px-4 py-2 rounded-t-lg transition-colors ${
                      activeTab === 'matchup' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Matchup Totals
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
                
                {/* Team Tab 選擇器 (靠右) */}
                <div className="flex space-x-4">
                  {data.map((team, index) => {
                    const teamName = team.team_name || 'TBD';
                    const isDisabled = !team.team_name || !team.manager_id;
                    const isActive = selectedManagerId === team.manager_id;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (!isDisabled && !loadingDetails && !loadingTodayData && !loadingMissedData) {
                            setSelectedManagerId(team.manager_id)
                            setSelectedTeamName(teamName)
                            fetchPlayerDetails(team.manager_id)
                            fetchTodayPlayerDetails(team.manager_id)
                            fetchMissedData(team.manager_id)
                          }
                        }}
                        disabled={isDisabled || loadingDetails || loadingTodayData || loadingMissedData}
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
              
              {/* 手機版：直排佈局 */}
              <div className="lg:hidden space-y-4 mb-6">
                {/* Data Type Tab 選擇器 */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('matchup')}
                    className={`px-4 py-2 rounded-t-lg transition-colors ${
                      activeTab === 'matchup' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Matchup Totals
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
                          if (!isDisabled && !loadingDetails && !loadingTodayData && !loadingMissedData) {
                            setSelectedManagerId(team.manager_id)
                            setSelectedTeamName(teamName)
                            fetchPlayerDetails(team.manager_id)
                            fetchTodayPlayerDetails(team.manager_id)
                            fetchMissedData(team.manager_id)
                          }
                        }}
                        disabled={isDisabled || loadingDetails || loadingTodayData || loadingMissedData}
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
              
              {/* 球員詳細數據內容 */}
              <div className="bg-white rounded-lg p-4">
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

                      {/* 錯失數據分析 */}
                      <div>
                        <h3 className="text-lg font-bold text-[#0155A0] mb-2">🔍 錯失數據分析</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          以下顯示你的球員在該期間內沒有被排入先發陣容，但實際上有表現的數據。這些是你可能錯失的得分機會。
                        </p>
                        
                        {loadingMissedData ? (
                          <div className="flex justify-center items-center p-8">
                            <p className="text-blue-600 animate-pulse">載入錯失數據中...</p>
                          </div>
                        ) : !selectedManagerId ? (
                          <div className="text-center p-8">
                            <p className="text-gray-500">請點選上方隊伍標籤查看錯失數據</p>
                          </div>
                        ) : !missedData ? (
                          <div className="text-center p-8">
                            <p className="text-gray-500">載入錯失數據中...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* 錯失打者數據 */}
                            {missedData.missedBatterRows && missedData.missedBatterRows.length > 0 && (
                              <div>
                                <h4 className="text-md font-bold text-[#0155A0] mb-2">錯失的打者表現</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full border text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        {['Name', 'AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map(key => (
                                          <th key={key} className="border px-2 py-2 text-center font-semibold">{key}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {missedData.missedBatterRows.map((row, i) => {
                                        const isTotal = row.Name === '總計'
                                        return (
                                          <tr key={i} className={isTotal ? 'bg-yellow-100 font-bold' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                                            {['Name', 'AB', 'R', 'H', 'HR', 'RBI', 'SB', 'K', 'BB', 'GIDP', 'XBH', 'TB', 'AVG', 'OPS'].map((key, j) => (
                                              <td key={j} className={`border px-2 py-1 text-center whitespace-nowrap ${isTotal ? 'font-bold' : ''}`}>
                                                {row[key]}
                                              </td>
                                            ))}
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* 錯失投手數據 */}
                            {missedData.missedPitcherRows && missedData.missedPitcherRows.length > 0 && (
                              <div>
                                <h4 className="text-md font-bold text-[#0155A0] mb-2">錯失的投手表現</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full border text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        {['Name', 'IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map(key => (
                                          <th key={key} className="border px-2 py-2 text-center font-semibold">{key}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {missedData.missedPitcherRows.map((row, i) => {
                                        const isTotal = row.Name === '總計'
                                        return (
                                          <tr key={i} className={isTotal ? 'bg-yellow-100 font-bold' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                                            {['Name', 'IP', 'W', 'L', 'HLD', 'SV', 'H', 'ER', 'K', 'BB', 'QS', 'OUT', 'ERA', 'WHIP'].map((key, j) => (
                                              <td key={j} className={`border px-2 py-1 text-center whitespace-nowrap ${isTotal ? 'font-bold' : ''}`}>
                                                {row[key]}
                                              </td>
                                            ))}
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* 如果沒有錯失數據 */}
                            {(!missedData.missedBatterRows || missedData.missedBatterRows.length === 0) && 
                             (!missedData.missedPitcherRows || missedData.missedPitcherRows.length === 0) && (
                              <div className="text-center p-8">
                                <p className="text-green-600 font-semibold">🎉 太棒了！你沒有錯失任何重要的球員表現！</p>
                                <p className="text-sm text-gray-600 mt-2">所有有表現的球員都已被正確安排在先發陣容中。</p>
                              </div>
                            )}
                          </div>
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
            </div>
          </div>
        </div>
      )}

      {/* 渲染球員詳細數據模態框 */}
      {renderPlayerDetailsModal()}
    </div>
  )
}
