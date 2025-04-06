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
  const [tab, setTab] = useState('firstHalf')

  // 取得登入者名稱
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('user_id='))
    if (!cookie) return router.push('/login')
    const user_id = cookie.split('=')[1]
    supabase.from('managers').select('name').eq('id', user_id).single().then(({ data }) => {
      if (data) setUserName(data.name)
    })
  }, [])

  // 取得 schedule + managers 對應隊名
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

  // 查詢 standings（API 傳回 team_name）
  useEffect(() => {
    async function fetchStandings() {
      const res = await fetch('/api/standings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab }),
      })
      const result = await res.json()
      setStandings(result)
    }
    fetchStandings()
  }, [tab])

  const handleFilter = week => {
    setSelectedWeek(week)
    if (week === '') setFiltered(schedules)
    else setFiltered(schedules.filter(s => s.week === week))
  }

  const renderStandings = (type) => {
    const keys = [
      `${type}_1st`,
      `${type}_2nd`,
      `${type}_3rd`,
      `${type}_4th`,
      `${type}_points`,
    ]

    return (
      <table className="w-full text-sm text-center mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">名次</th>
            <th className="p-2">隊名</th>
            <th className="p-2">1st</th>
            <th className="p-2">2nd</th>
            <th className="p-2">3rd</th>
            <th className="p-2">4th</th>
            <th className="p-2">分數</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{s.team_name}</td>
              {keys.map(k => (
                <td key={k} className="p-2">{s[k]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

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

      <Card className="mt-6">
        <CardContent>
          <Tabs defaultValue="firstHalf" value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="firstHalf">上半季</TabsTrigger>
              <TabsTrigger value="secondHalf">下半季</TabsTrigger>
              <TabsTrigger value="season">全年</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>{renderStandings(tab)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
