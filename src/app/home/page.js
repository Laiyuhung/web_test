'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

export default function HomePage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [schedules, setSchedules] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selectedWeek, setSelectedWeek] = useState('')
  const [currentWeek, setCurrentWeek] = useState('')
  const [standings, setStandings] = useState([])

  // 取得登入者名稱
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_id='))
    if (!cookie) return router.push('/login')
    const user_id = cookie.split('=')[1]
    supabase
      .from('managers')
      .select('name')
      .eq('id', user_id)
      .single()
      .then(({ data }) => {
        if (data) setUserName(data.name)
      })
  }, [])

  // 取得賽程與推算當週
  useEffect(() => {
    async function fetchSchedules() {
      const { data } = await supabase
        .from('schedule')
        .select('*')
        .order('start_date', { ascending: true })

      if (!data) return
      setSchedules(data)

      const sorted = [...data].sort((a, b) => {
        const aWeek = parseInt(a.week.replace('W', ''))
        const bWeek = parseInt(b.week.replace('W', ''))
        return aWeek - bWeek
      })

      const today = new Date()
      const current = sorted.find(row => {
        const start = new Date(row.start_date)
        const end = new Date(row.end_date)
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

  // 取得戰績資料
  useEffect(() => {
    async function fetchStandings() {
      const { data } = await supabase.from('standings').select('*')
      if (data) setStandings(data)
    }
    fetchStandings()
  }, [])

  const handleFilter = week => {
    setSelectedWeek(week)
    if (week === '') setFiltered(schedules)
    else setFiltered(schedules.filter(s => s.week === week))
  }

  const renderStandingTable = (type) => {
    const labelMap = {
      firstHalf: '上半季',
      secondHalf: '下半季',
      season: '整季'
    }
    return (
      <Card className="mt-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-2">{labelMap[type]} 戰績</h2>
          <table className="w-full text-sm text-center border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">名次</th>
                <th className="p-2">分數</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map(rank => (
                <tr key={rank} className="border-t">
                  <td className="p-2">{standings[0]?.[`${type}_${rank}st`] || standings[0]?.[`${type}_${rank}nd`] || standings[0]?.[`${type}_${rank}rd`] || standings[0]?.[`${type}_${rank}th`]}</td>
                  <td className="p-2">{standings[0]?.[`${type}_points`] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          onClick={() => handleFilter(currentWeek)}
          variant={selectedWeek === currentWeek ? 'default' : 'outline'}
        >
          This week ⭐
        </Button>
        <Button
          onClick={() => handleFilter('')}
          variant={selectedWeek === '' ? 'default' : 'outline'}
        >
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

      <Tabs defaultValue="firstHalf" className="mt-8">
        <TabsList className="mb-4">
          <TabsTrigger value="firstHalf">上半季</TabsTrigger>
          <TabsTrigger value="secondHalf">下半季</TabsTrigger>
          <TabsTrigger value="season">整季</TabsTrigger>
        </TabsList>
        <TabsContent value="firstHalf">{renderStandingTable('firstHalf')}</TabsContent>
        <TabsContent value="secondHalf">{renderStandingTable('secondHalf')}</TabsContent>
        <TabsContent value="season">{renderStandingTable('season')}</TabsContent>
      </Tabs>
    </div>
  )
}
