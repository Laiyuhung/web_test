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

  const renderScoreTable = () => (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#0155A0] mb-2">Fantasy Points</h2>
      <div className="overflow-x-auto">
        <table className="table-auto border w-full text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-3 py-2 text-center">Result</th>
              <th className="border px-3 py-2 text-left">Team</th>
              {pointKeys.map((key) => (
                <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">
                  {key.slice(2)}
                </th>
              ))}
              <th className="border px-3 py-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.team_name} className="text-sm">
                <td className="border px-3 py-2 text-center font-bold">
                  <span className={`px-2 py-1 rounded text-white ${d.isWinner ? 'bg-green-600' : 'bg-red-600'}`}>
                    {d.isWinner ? 'WIN' : 'LOSE'}
                  </span>
                </td>
                <td 
                  onClick={() => {
                    if (!loadingDetails) {
                      setSelectedManagerId(d.manager_id)
                      setSelectedTeamName(d.team_name)
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
                    ? d.batters?.fantasyPoints?.[key.slice(2)] ?? '0'
                    : d.pitchers?.fantasyPoints?.[key.slice(2)] ?? '0'

                  return (
                    <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                      {value}
                    </td>
                  )
                })}
                <td className="border px-3 py-2 text-center font-bold">{d.fantasyPoints?.Total || '0'}</td>
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
              <th className="border px-3 py-2 text-center">Result</th>
              <th className="border px-3 py-2 text-left">Team</th>
              {keys.map((key) => (
                <th key={key} className="border px-3 py-2 text-center whitespace-nowrap">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.team_name} className="text-sm">
                <td className="border px-3 py-2 text-center font-bold">
                  <span className={`px-2 py-1 rounded text-white ${d.isWinner ? 'bg-green-600' : 'bg-red-600'}`}>
                    {d.isWinner ? 'WIN' : 'LOSE'}
                  </span>
                </td>
                <td 
                  onClick={() => {
                    if (!loadingDetails) {
                      setSelectedManagerId(d.manager_id)
                      setSelectedTeamName(d.team_name)
                      fetchPlayerDetails(d.manager_id)
                    }
                  }}
                  className={`font-bold border px-3 py-2 text-left bg-gray-100 whitespace-nowrap ${!loadingDetails ? "cursor-pointer hover:bg-blue-100 hover:text-blue-600" : "opacity-70"}`}
                  title={loadingDetails ? "資料載入中..." : "點擊查看球員詳細數據"}
                >
                  {d.team_name} {loadingDetails && d.manager_id === selectedManagerId && <span className="inline-block ml-1 text-blue-600">載入中...</span>}
                </td>
                {keys.map((key) => (
                  <td key={key} className="border px-3 py-2 text-center text-[#0155A0] font-semibold whitespace-nowrap">
                    {d[type][key]}
                  </td>
                ))}
              </tr>
            ))}
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
              {m.stage} {m.stage_game} - {m.team1_name} vs {m.team2_name} ({m.start_date} ~ {m.end_date})
            </option>
          ))}
        </select>
      </div>

      {selectedMatchup && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-lg">{selectedMatchup.stage} {selectedMatchup.stage_game}</h3>
          <p className="text-sm text-gray-600">
            {selectedMatchup.team1_name} vs {selectedMatchup.team2_name}
          </p>
          <p className="text-sm text-gray-600">
            賽程期間：{selectedMatchup.start_date} ~ {selectedMatchup.end_date}
          </p>
          {(selectedMatchup.score1 !== null && selectedMatchup.score2 !== null) && (
            <p className="text-sm font-semibold mt-2">
              最終比分：{selectedMatchup.team1_name} {selectedMatchup.score1} - {selectedMatchup.score2} {selectedMatchup.team2_name}
            </p>
          )}
        </div>
      )}

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
