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
      console.log('📅 系統時間 today:', today.toISOString().slice(0, 10))

      const current = sorted.find(row => {
        const start = new Date(row.start_date)
        const end = new Date(row.end_date)

        console.log(`🔍 檢查 ${row.week}: ${row.start_date} ~ ${row.end_date}`)
        console.log('📍 start:', start.toISOString(), 'end:', end.toISOString())
        console.log('✅ 是否在區間：', today >= start && today <= end)

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

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleFilter = week => {
    setSelectedWeek(week)
    if (week === '') setFiltered(schedules)
    else setFiltered(schedules.filter(s => s.week === week))
  }

  const sortedWeeks = [...new Set(schedules.map(s => s.week))].sort((a, b) => {
    return parseInt(a.replace('W', '')) - parseInt(b.replace('W', ''))
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-bold">👤 歡迎 {userName}</div>
        <Button variant="destructive" onClick={handleLogout}>登出</Button>
      </div>

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
    </div>
  )
}
