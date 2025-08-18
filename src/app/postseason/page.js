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
        
        // 預設選擇第一個賽程
        if (result.length > 0) {
          setSelectedMatchup(result[0])
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
      }, 300)
    }
  }

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
                <td className="py-2 px-4 text-sm font-bold text-gray-700 w-1/3"></td>
                <td className="py-2 px-4 text-sm font-bold text-gray-700 bg-gray-300 w-1/3">
                  Batters Total
                </td>
                <td className="py-2 px-4 text-sm font-bold text-gray-700 w-1/3"></td>
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
                    <td 
                      onClick={() => {
                        if (!loadingDetails && team1.manager_id) {
                          setSelectedManagerId(team1.manager_id)
                          setSelectedTeamName(team1.team_name)
                          fetchPlayerDetails(team1.manager_id)
                        }
                      }}
                      className={`py-3 px-4 text-lg font-semibold w-1/3 ${team1Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team1.manager_id ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team1.manager_id ? "點擊查看球員詳細數據" : ""}
                    >
                      {team1.batters[key]}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-600 bg-gray-100 w-1/3">
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
                      className={`py-3 px-4 text-lg font-semibold w-1/3 ${team2Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team2.manager_id ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team2.manager_id ? "點擊查看球員詳細數據" : ""}
                    >
                      {team2.batters[key]}
                    </td>
                  </tr>
                );
              })}
              
              {/* Pitchers Total 標題行 */}
              <tr className="bg-gray-200">
                <td className="py-2 px-4 text-sm font-bold text-gray-700 w-1/3"></td>
                <td className="py-2 px-4 text-sm font-bold text-gray-700 bg-gray-300 w-1/3">
                  Pitchers Total
                </td>
                <td className="py-2 px-4 text-sm font-bold text-gray-700 w-1/3"></td>
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
                    <td 
                      onClick={() => {
                        if (!loadingDetails && team1.manager_id) {
                          setSelectedManagerId(team1.manager_id)
                          setSelectedTeamName(team1.team_name)
                          fetchPlayerDetails(team1.manager_id)
                        }
                      }}
                      className={`py-3 px-4 text-lg font-semibold w-1/3 ${team1Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team1.manager_id ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team1.manager_id ? "點擊查看球員詳細數據" : ""}
                    >
                      {team1.pitchers[key]}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-600 bg-gray-100 w-1/3">
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
                      className={`py-3 px-4 text-lg font-semibold w-1/3 ${team2Better ? 'bg-blue-100 font-bold' : ''} ${!loadingDetails && team2.manager_id ? "cursor-pointer hover:bg-gray-200" : ""}`}
                      title={!loadingDetails && team2.manager_id ? "點擊查看球員詳細數據" : ""}
                    >
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
    if (!playerDetailsModalOpen || !playerDetailsData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 p-4 flex justify-between items-center border-b z-10">
            <h2 className="text-xl font-bold">
              {selectedTeamName} 的季後賽球員數據
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
              {m.stage} {m.stage_game} - {m.team1_name} vs {m.team2_name}
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
              <div className="text-center">
                <div className="text-2xl font-bold text-[#0155A0]">
                  {data[0].team_name || 'TBD'}
                </div>
              </div>
              <div className="mx-8 flex items-center">
                <div className="text-4xl font-bold mr-2">
                  {data[0].fantasyPoints?.Total || '0'}
                </div>
                <div className="text-2xl font-bold text-gray-400 mx-2">/</div>
                <div className="text-4xl font-bold ml-2">
                  {data[1].fantasyPoints?.Total || '0'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#0155A0]">
                  {data[1].team_name || 'TBD'}
                </div>
              </div>
            </div>
          </div>
          
          {/* 統合的數據表格 */}
          {renderCombinedStatTable()}
        </div>
      )}

      {/* 渲染球員詳細數據模態框 */}
      {renderPlayerDetailsModal()}
    </div>
  )
}
