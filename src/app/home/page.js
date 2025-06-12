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
  const [postseasonTab, setPostseasonTab] = useState('reason')
  const [postseasonSpots, setPostseasonSpots] = useState([])
  const [managerMap, setManagerMap] = useState({})

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
    async function fetchPostseasonSpots() {
      const res = await fetch('/api/postseason_spot')
      const data = await res.json()
      console.log('postseason_spot data', data)
      setPostseasonSpots(data)
      // 取得所有 manager_id 對應隊名
      const ids = Array.from(new Set(data.map(d => d.manager_id).filter(Boolean)))
      console.log('manager_ids', ids)
      if (ids.length > 0) {
        const { data: managers, error } = await supabase
          .from('managers')
          .select('id, team_name')
          .in('id', ids)
        console.log('managers', managers, error)
        setManagerMap(Object.fromEntries((managers||[]).map(m => [m.id, m.team_name])))
      }
    }
    fetchPostseasonSpots()
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

  const renderPostseasonReason = () => (
    <table className="w-full text-sm text-center mt-4">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2">晉級隊伍</th>
          <th className="p-2">晉級緣由</th>
        </tr>
      </thead>
      <tbody>
        {postseasonSpots.map((s, i) => (
          <tr key={s.id} className="border-t">
            <td className="p-2">{managerMap[s.manager_id] || s.manager_id || '-'}</td>
            <td className="p-2">{s.type}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="p-6">
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

      {/* 新增：季後賽晉級區塊 */}
      <h2 className="text-xl font-bold text-[#0155A0] mb-2">季後賽晉級</h2>
      <Card className="mb-6">
        <CardContent>
          <Tabs defaultValue="reason" value={postseasonTab} onValueChange={setPostseasonTab}>
            <TabsList>
              <TabsTrigger value="reason">晉級緣由</TabsTrigger>
            </TabsList>
            <TabsContent value="reason">{renderPostseasonReason()}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}