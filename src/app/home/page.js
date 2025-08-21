'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function HomePage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [schedules, setSchedules] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selectedWeek, setSelectedWeek] = useState('')
  const [currentWeek, setCurrentWeek] = useState('')
  const [standings, setStandings] = useState([])
  const [standingTab, setStandingTab] = useState('secondHalf')
  const [rewardTab, setRewardTab] = useState('summary')
  const [rewardSummary, setRewardSummary] = useState([])
  const [rewardList, setRewardList] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [transactionMode, setTransactionMode] = useState('recent')
  const [postseasonSchedule, setPostseasonSchedule] = useState([])
  const [postseasonSeries, setPostseasonSeries] = useState([])
  const [postseasonTab, setPostseasonTab] = useState('bracket')

  useEffect(() => {
    async function fetchRecentTransactions() {
      try {
        const res = await fetch('/api/transaction/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: transactionMode }), // ✅ 改這裡！
        })
        const data = await res.json()
        console.log('📦 交易資料', data) // 👈 這行加進來！
        if (res.ok) setRecentTransactions(data)
      } catch (err) {
        console.error('❌ 載入交易紀錄失敗', err)
      }
    }
    fetchRecentTransactions()
  }, [transactionMode])
  

  useEffect(() => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('user_id='))
    if (!cookie) {
      localStorage.removeItem('user_id')  // 🧼 清除 localStorage
      return router.push('/login')
    }
  
    const user_id = cookie.split('=')[1]
  
    supabase
      .from('managers')
      .select('name')
      .eq('id', user_id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          localStorage.removeItem('user_id')  // ❌ 無效登入資料 → 清除
          router.push('/login')
        } else {
          setUserName(data.name)
        }
      })
  }, [router])
  

  useEffect(() => {
    async function fetchSchedules() {
      const [{ data: scheduleData }, { data: managerData }] = await Promise.all([
        supabase.from('schedule').select('*').order('start_date', { ascending: true }),
        supabase.from('managers').select('id, team_name')
      ])
      if (!scheduleData || !managerData) return

      const nameMap = Object.fromEntries(managerData.map(m => [String(m.id), m.team_name]))

      const mapped = scheduleData.map(row => ({
        ...row,
        team1: nameMap[row.team1] || row.team1,
        team2: nameMap[row.team2] || row.team2,
        team3: nameMap[row.team3] || row.team3,
        team4: nameMap[row.team4] || row.team4,
      }))

      setSchedules(mapped)

      const sorted = [...mapped].sort((a, b) => parseInt(a.week.replace('W', '')) - parseInt(b.week.replace('W', '')))
      const today = new Date()

      const current = sorted.find(row => {
        const start = new Date(row.start_date)
        const end = new Date(row.end_date + 'T23:59:59')
        return today >= start && today <= end
      })

      if (current) {
        setCurrentWeek(current.week)
        setSelectedWeek(current.week)
        setFiltered([current])
      } else {
        setFiltered(sorted)
      }
    }

    fetchSchedules()
  }, [])

  useEffect(() => {
    async function fetchStandings() {
      const res = await fetch('/api/standings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: standingTab }), // ✅ 改這裡
      })
      const result = await res.json()
      setStandings(result)
    }
    fetchStandings()
  }, [standingTab])
  

  useEffect(() => {
    async function fetchRewards() {
      const res = await fetch('/api/rewards/all')
      const result = await res.json()
      if (res.ok) {
        setRewardSummary(result.summary)
        setRewardList(result.list)
      }
    }
    fetchRewards()
  }, [])

  useEffect(() => {
    async function fetchPostseasonSchedule() {
      const res = await fetch('/api/postseason_schedule')
      const data = await res.json()
      console.log('postseason_schedule data', data)
      setPostseasonSchedule(data)
    }
    fetchPostseasonSchedule()
  }, [])

  useEffect(() => {
    async function fetchPostseasonSeries() {
      const res = await fetch('/api/postseason_series')
      const data = await res.json()
      console.log('postseason_series data', data)
      setPostseasonSeries(data)
    }
    fetchPostseasonSeries()
  }, [])

  const handleFilter = week => {
    setSelectedWeek(week)
    if (week === '') setFiltered(schedules)
    else setFiltered(schedules.filter(s => s.week === week))
  }

  const renderRecentTransactions = () => (
    <div className="space-y-2 mt-4">
      {recentTransactions.map((t, i) => {
        let symbol = '⇄'
        let color = 'text-blue-600'
        if (t.type === 'Add' || t.type === 'Draft Add') {
          symbol = '＋'
          color = 'text-green-600'
        } else if (t.type === 'Drop' || t.type === 'Waiver Drop') {
          symbol = '－'
          color = 'text-red-600'
        } else if (t.type === 'Waiver Add') {
          symbol = '＋'
          color = 'text-yellow-500'
        }
  
        const formattedTime = new Date(t.transaction_time).toLocaleString('en-US', {
          timeZone: 'Asia/Taipei',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        
  
        return (
          <div
            key={i}
            className="flex items-center justify-between border rounded px-4 py-2 bg-white shadow-sm"
          >
            <div className={`text-2xl font-bold ${color}`}>{symbol}</div>
            <div className="flex-1 text-left ml-4 font-semibold text-[#0155A0]">{t.player_name}</div>
            <div className="text-right text-sm text-gray-600 whitespace-nowrap">
              <div>{t.manager}</div>
              <div>{formattedTime}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
  
  

  const renderStandings = (type) => (
    <table className="w-full text-sm text-center mt-4">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2">名次</th>
          <th className="p-2">隊名</th>
          <th className="p-2">總積分</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.id} className="border-t">
            <td className="p-2">{i + 1}</td>
            <td className="p-2">{s.team_name}</td>
            <td className="p-2">{s[`${type}_points`] ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderRewardSummary = () => (
    <table className="w-full text-sm text-center mt-4">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2">隊名</th>
          <th className="p-2">獎金總額</th>
        </tr>
      </thead>
      <tbody>
        {rewardSummary.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">{r.team_name}</td>
            <td className="p-2">{r.total}</td>   
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderRewardList = () => (
    <table className="w-full text-sm text-center mt-4">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2">隊名</th>
          <th className="p-2">事件</th>
          <th className="p-2">金額</th>
          <th className="p-2">時間</th>
        </tr>
      </thead>
      <tbody>
        {rewardList.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">{r.team_name}</td>
            <td className="p-2">{r.event}</td>
            <td className="p-2">{r.awards}</td>
            <td className="p-2">{r.created_at?.slice(0, 10)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderPostseasonSchedule = () => (
    <div className="space-y-3 mt-4">
      {postseasonSchedule.map((match, i) => {
        // 格式化日期為 M/D
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        };

        // 處理隊伍名稱
        const team1Display = match.team1_name || 'TBD';
        const team2Display = match.team2_name || 'TBD';

        // 處理比分顯示
        const score1 = match.score1 || 0;
        const score2 = match.score2 || 0;
        const scoreDisplay = (score1 === 0 && score2 === 0) ? 'vs' : `${score1} : ${score2}`;

        return (
          <div key={match.id || i} className="p-3 bg-gray-50 rounded-lg">
            {/* 桌面版佈局 */}
            <div className="hidden md:flex items-center text-sm font-bold">
              <span className="text-[#0155A0] w-1/4">
                {match.stage} {match.stage_game}
              </span>
              <span className="w-1/4 text-center">
                {formatDate(match.start_date)} ~ {formatDate(match.end_date)}
              </span>
              <span className="w-1/2 text-center">
                {team1Display} {scoreDisplay} {team2Display}
              </span>
            </div>
            
            {/* 手機版佈局 */}
            <div className="md:hidden space-y-2 text-sm font-bold">
              <div className="text-[#0155A0]">
                {match.stage} {match.stage_game}
              </div>
              <div className="text-center">
                {formatDate(match.start_date)} ~ {formatDate(match.end_date)}
              </div>
              <div className="text-center">
                {team1Display} {scoreDisplay} {team2Display}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )

  const renderPostseasonBracket = () => {
    // 根據 stage_no 分組系列賽
    const groupedSeries = postseasonSeries.reduce((acc, series) => {
      const stage = series.stage_no || 1;
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(series);
      return acc;
    }, {});

    // 取得所有輪次並排序
    const stages = Object.keys(groupedSeries).sort((a, b) => parseInt(a) - parseInt(b));

    // 手機版渲染
    const renderMobileBracket = () => (
      <div className="md:hidden space-y-6">
        {stages.map((stage, stageIndex) => (
          <div key={stage} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0155A0] bg-blue-50 py-2 px-3 rounded flex-1 text-center">
                {groupedSeries[stage][0]?.stage || `第${stage}輪`}
              </h3>
            </div>
            <div className="space-y-3">
              {groupedSeries[stage].map((series, i) => {
                const higherTeam = series.higher_seed_team_name || 'TBD';
                const lowerTeam = series.lower_seed_team_name || 'TBD';
                const higherScore = series.higher_seed_score || 0;
                const lowerScore = series.lower_seed_score || 0;
                // 晉級規則：stage 1 需積分2獲勝，stage 2 只需1勝
                let winScore = 2;
                if (stage === '2' || stage === 2) winScore = 1;
                const higherWon = higherScore >= winScore;
                const lowerWon = lowerScore >= winScore;
                const seriesCompleted = higherWon || lowerWon;
                const now = new Date();
                const startDate = series.start_date ? new Date(series.start_date) : null;
                const hasStarted = startDate ? now >= startDate : true; // 如果沒有 start_date，預設已開始
                const hasScore = higherScore > 0 || lowerScore > 0;
                
                // 判斷系列賽狀態
                let status = '';
                let statusColor = '';
                if (!hasStarted) {
                  status = '未開始';
                  statusColor = 'bg-gray-500';
                } else if (seriesCompleted) {
                  status = '完賽';
                  statusColor = 'bg-green-500';
                } else if (hasScore) {
                  status = '進行中';
                  statusColor = 'bg-orange-500';
                }

                return (
                  <div key={series.id || i} className="border rounded-lg overflow-hidden relative">
                    {/* 狀態標籤與 Stage 同排 */}
                    {status && (
                      <div className="flex justify-end p-2 bg-gray-50">
                        <div className={`${statusColor} text-white text-xs px-2 py-1 rounded`}>
                          {status}
                        </div>
                      </div>
                    )}
                    
                    {/* 隊伍對戰 */}
                    <div className={`flex justify-between items-center p-3 border-b ${
                      lowerWon ? 'bg-green-100 font-bold' : 
                      seriesCompleted ? 'bg-gray-200 text-gray-500' : 
                      !hasStarted ? 'bg-gray-100 text-gray-600' : 'bg-gray-50'
                    }`}>
                      <span className="text-sm truncate flex-1">{lowerTeam}</span>
                      <span className="text-lg font-bold ml-3 w-8 text-center">{lowerScore}</span>
                    </div>
                    <div className={`flex justify-between items-center p-3 ${
                      higherWon ? 'bg-green-100 font-bold' : 
                      seriesCompleted ? 'bg-gray-200 text-gray-500' : 
                      !hasStarted ? 'bg-gray-100 text-gray-600' : 'bg-gray-50'
                    }`}>
                      <span className="text-sm truncate flex-1">{higherTeam}</span>
                      <span className="text-lg font-bold ml-3 w-8 text-center">{higherScore}</span>
                    </div>
                    
                    {/* 晉級箭頭 */}
                    {stageIndex < stages.length - 1 && seriesCompleted && (
                      <div className="text-center py-2 bg-blue-50">
                        <span className="text-xs text-blue-600">
                          {higherWon ? higherTeam : lowerTeam} 晉級 ↓
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* 手機版冠軍區域 */}
        {stages.length > 0 && (() => {
          // 找到最後一輪的獲勝者
          const finalStage = Math.max(...stages.map(s => parseInt(s)));
          const finalSeries = groupedSeries[finalStage.toString()];
          let champion = null;
          
          if (finalSeries && finalSeries.length > 0) {
            const finalMatch = finalSeries[0]; // 假設最後一輪只有一場比賽
            const higherScore = finalMatch.higher_seed_score || 0;
            const lowerScore = finalMatch.lower_seed_score || 0;
            
            if (higherScore >= 2) {
              champion = finalMatch.higher_seed_team_name;
            } else if (lowerScore >= 2) {
              champion = finalMatch.lower_seed_team_name;
            }
          }
          
          return (
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-4 text-center border-2 border-yellow-400">
              <h3 className="text-sm font-bold text-red-600 mb-2">🏆 CHAMPION</h3>
              {champion ? (
                <div>
                  <div className="text-lg font-bold text-gray-800">{champion}</div>
                  <div className="text-xs text-gray-600 mt-1">總冠軍</div>
                </div>
              ) : (
                <div>
                  <div className="text-lg">👑</div>
                  <div className="text-xs text-gray-600 mt-1">待定</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );

    // 桌面版渲染（原有設計）
    const renderDesktopBracket = () => (
      <div className="hidden md:block overflow-x-auto bg-gray-50 p-6 rounded-lg">
        <div className="flex justify-center items-center min-w-max">
          {stages.map((stage, stageIndex) => (
            <div key={stage} className="flex flex-col items-center relative">
              {/* Stage 標題 */}
              <h3 className="text-sm font-bold text-[#0155A0] mb-6 bg-white px-3 py-1 rounded-full border">
                {groupedSeries[stage][0]?.stage || `第${stage}輪`}
              </h3>
              
              {/* 系列賽方框 */}
              <div className="flex flex-col justify-center space-y-8 relative">
                {groupedSeries[stage].map((series, i) => {
                  const higherTeam = series.higher_seed_team_name || 'TBD';
                  const lowerTeam = series.lower_seed_team_name || 'TBD';
                  const higherScore = series.higher_seed_score || 0;
                  const lowerScore = series.lower_seed_score || 0;
                  // 晉級規則：stage 1 需積分2獲勝，stage 2 只需1勝
                  let winScore = 2;
                  if (stage === '2' || stage === 2) winScore = 1;
                  const higherWon = higherScore >= winScore;
                  const lowerWon = lowerScore >= winScore;
                  const seriesCompleted = higherWon || lowerWon;
                  const now = new Date();
                  const startDate = series.start_date ? new Date(series.start_date) : null;
                  const hasStarted = startDate ? now >= startDate : true; // 如果沒有 start_date，預設已開始
                  
                  return (
                    <div key={series.id || i} className="relative">
                      {/* 連接線 - 右側輸出 */}
                      {stageIndex < stages.length - 1 && (
                        <div className="absolute top-1/2 -right-8 w-8 h-px bg-gray-400 z-10"></div>
                      )}
                      
                      {/* 比賽方框 */}
                      <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md w-48 relative z-20">
                        {/* 狀態標籤與 Stage 同一高度 */}
                        {status && (
                          <div className="absolute -top-8 right-0 flex justify-end">
                            <div className={`${statusColor} text-white text-xs px-2 py-1 rounded`}>
                              {status}
                            </div>
                          </div>
                        )}
                        <div className="space-y-0">
                          <div className={`flex justify-between items-center p-3 border-b ${
                            lowerWon ? 'bg-green-100 font-bold border-green-300' : 
                            seriesCompleted ? 'bg-gray-200 text-gray-500' : 
                            !hasStarted ? 'bg-gray-100 text-gray-600' : 'bg-white'
                          }`}>
                            <span className="text-sm truncate">{lowerTeam}</span>
                            <span className="text-sm font-mono ml-2">{lowerScore}</span>
                          </div>
                          <div className={`flex justify-between items-center p-3 ${
                            higherWon ? 'bg-green-100 font-bold border-green-300' : 
                            seriesCompleted ? 'bg-gray-200 text-gray-500' : 
                            !hasStarted ? 'bg-gray-100 text-gray-600' : 'bg-white'
                          }`}>
                            <span className="text-sm truncate">{higherTeam}</span>
                            <span className="text-sm font-mono ml-2">{higherScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 垂直連接線組合 - 連接到下一輪 */}
              {stageIndex < stages.length - 1 && groupedSeries[stage].length > 1 && (
                <div className="absolute top-1/2 -right-4 flex flex-col items-center">
                  {Array.from({ length: Math.ceil(groupedSeries[stage].length / 2) }).map((_, i) => (
                    <div key={i} className="relative">
                      <div className="w-px h-16 bg-gray-400 relative">
                        <div className="absolute top-0 -left-4 w-8 h-px bg-gray-400"></div>
                        <div className="absolute bottom-0 -left-4 w-8 h-px bg-gray-400"></div>
                        <div className="absolute top-1/2 left-0 w-8 h-px bg-gray-400"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 右側間距 */}
              {stageIndex < stages.length - 1 && <div className="w-16"></div>}
            </div>
          ))}
          
          {/* 冠軍區域 */}
          {stages.length > 0 && (() => {
            // 找到最後一輪的獲勝者
            const finalStage = Math.max(...stages.map(s => parseInt(s)));
            const finalSeries = groupedSeries[finalStage.toString()];
            let champion = null;
            
            if (finalSeries && finalSeries.length > 0) {
              const finalMatch = finalSeries[0]; // 假設最後一輪只有一場比賽
              const higherScore = finalMatch.higher_seed_score || 0;
              const lowerScore = finalMatch.lower_seed_score || 0;
              // 冠軍判定依照最後一輪規則
              let winScore = 2;
              if (finalStage === 2) winScore = 1;
              if (higherScore >= winScore) {
                champion = finalMatch.higher_seed_team_name;
              } else if (lowerScore >= winScore) {
                champion = finalMatch.lower_seed_team_name;
              }
            }
            
            return (
              <div className="flex flex-col items-center ml-8">
                <h3 className="text-sm font-bold text-red-600 mb-6 bg-yellow-100 px-3 py-1 rounded-full border-2 border-yellow-400">
                  CHAMPION
                </h3>
                <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400 rounded-lg shadow-lg w-48 p-4">
                  <div className="text-center">
                    {champion ? (
                      <div>
                        <div className="text-lg font-bold text-gray-800 mb-2">🏆</div>
                        <div className="text-sm font-bold text-gray-800">{champion}</div>
                        <div className="text-xs text-gray-600 mt-1">總冠軍</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-lg font-bold text-gray-600">👑</div>
                        <div className="text-sm text-gray-500 mt-2">待定</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );

    return (
      <div className="mt-4">
        {renderMobileBracket()}
        {renderDesktopBracket()}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 季後賽賽程區塊 */}
      <h2 className="text-lg font-bold text-[#0155A0] mt-8 mb-2">【季後賽賽程】</h2>
      <Card className="mb-6">
        <CardContent className="p-4">
          <Tabs value={postseasonTab} onValueChange={setPostseasonTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bracket" className="text-sm">Bracket</TabsTrigger>
              <TabsTrigger value="schedule" className="text-sm">Schedule</TabsTrigger>
            </TabsList>
            <TabsContent value="bracket" className="mt-4">
              {postseasonSeries.length > 0 ? renderPostseasonBracket() : (
                <div className="p-4 text-center text-gray-500 text-sm">目前沒有晉級圖資料</div>
              )}
            </TabsContent>
            <TabsContent value="schedule" className="mt-4">
              {postseasonSchedule.length > 0 ? renderPostseasonSchedule() : (
                <div className="p-4 text-center text-gray-500 text-sm">目前沒有季後賽賽程資料</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          onClick={() => currentWeek && handleFilter(currentWeek)}
          variant={selectedWeek === currentWeek ? 'default' : 'outline'}
          disabled={!currentWeek}
        >
          This week ⭐
        </Button>
        <Button onClick={() => handleFilter('')} variant={selectedWeek === '' ? 'default' : 'outline'}>
          All schedule
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Week</th>
                <th className="p-2">Date</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-bold">{s.week}</td>
                  <td className="p-2">{s.date_range}</td>
                  <td className="p-2">{s.team1}</td>
                  <td className="p-2">{s.score1}</td>
                  <td className="p-2">{s.team2}</td>
                  <td className="p-2">{s.score2}</td>
                  <td className="p-2">{s.team3}</td>
                  <td className="p-2">{s.score3}</td>
                  <td className="p-2">{s.team4}</td>
                  <td className="p-2">{s.score4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold text-[#0155A0] mt-8 mb-2">LIVE STANDINGS</h2>
      <Card className="mt-6">
        <CardContent>
          <Tabs defaultValue="firstHalf" value={standingTab} onValueChange={setStandingTab}>

            <TabsList>
              <TabsTrigger value="firstHalf">上半季</TabsTrigger>
              <TabsTrigger value="secondHalf">下半季</TabsTrigger>
              <TabsTrigger value="season">全年</TabsTrigger>
            </TabsList>
            <TabsContent value={standingTab}>{renderStandings(standingTab)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold text-[#0155A0] mt-8 mb-2">TRANSACTIONS</h2>
      <div className="flex gap-2 mb-2">
        <Button
          variant={transactionMode === 'recent' ? 'default' : 'outline'}
          onClick={() => setTransactionMode('recent')}
        >
          Recent
        </Button>
        <Button
          variant={transactionMode === 'all' ? 'default' : 'outline'}
          onClick={() => setTransactionMode('all')}
        >
          All
        </Button>
      </div>
      <Card className="mt-2">
        <CardContent>{renderRecentTransactions()}</CardContent>
      </Card>



      <h2 className="text-xl font-bold text-[#0155A0] mt-8 mb-2">REWARDS</h2>
      <Card className="mt-6">
        <CardContent>
          <Tabs defaultValue="summary" value={rewardTab} onValueChange={setRewardTab}>
            <TabsList>
              <TabsTrigger value="summary">累計金額</TabsTrigger>
              <TabsTrigger value="list">事件明細</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">{renderRewardSummary()}</TabsContent>
            <TabsContent value="list">{renderRewardList()}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}