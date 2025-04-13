'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [schedules, setSchedules] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selectedWeek, setSelectedWeek] = useState('')
  const [currentWeek, setCurrentWeek] = useState('')
  const [firstHalf, setFirstHalf] = useState([])
  const [secondHalf, setSecondHalf] = useState([])
  const [season, setSeason] = useState([])

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

  // 查詢三種 standings
  useEffect(() => {
    async function fetchAllStandings() {
      const fetchByType = async (type, setter) => {
        const res = await fetch('/api/standings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })
        const result = await res.json()
        setter(result)
      }

      fetchByType('firstHalf', setFirstHalf)
      fetchByType('secondHalf', setSecondHalf)
      fetchByType('season', setSeason)
    }
    fetchAllStandings()
  }, [])

  const handleFilter = week => {
    setSelectedWeek(week)
    if (week === '') setFiltered(schedules)
    else setFiltered(schedules.filter(s => s.week === week))
  }

  const renderStandings = (title, standings, type) => (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#0155A0] mb-2">{title}</h2>
      <table className="w-full text-sm text-center border">
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
    </div>
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

      <Card className="mt-6">
        <CardContent className="space-y-8">
          {renderStandings('📘 上半季戰績', firstHalf, 'firstHalf')}
          {renderStandings('📗 下半季戰績', secondHalf, 'secondHalf')}
          {renderStandings('📙 全年戰績', season, 'season')}
        </CardContent>
      </Card>
    </div>
  )
}
