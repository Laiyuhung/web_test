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
    supabase.from('managers').select('name').eq('id', user_id).single().then(({ data }) => {
      if (data) setUserName(data.name)
    })
  }, [])

  // 取得 schedule 並計算當週
  useEffect(() => {
    async function fetchSchedules() {
      const { data } = await supabase.from('schedule').select('*').order('week')
      if (!data) return
      setSchedules(data)

      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)
      const current = data.find(row => {
        const start = new Date(row.start_date)
        const end = new Date(row.end_date)
        return today >= start && today <= end
      })
      if (current) {
        setCurrentWeek(current.week)
        setSelectedWeek(current.week)
        setFiltered([current])
      } else {
        setFiltered(data)
      }
    }
    fetchSchedules()
  }, [])

  // 登出功能
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  // 切換週次
  const handleFilter = week => {
    setSelectedWeek(week)
    if (week === '') setFiltered(schedules)
    else setFiltered(schedules.filter(s => s.week === week))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-bold">👤 歡迎 {userName}</div>
        <Button variant="destructive" onClick={handleLogout}>登出</Button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <Button onClick={() => handleFilter('')}>全部週次</Button>
        {schedules.map(s => (
          <Button
            key={s.week}
            variant={selectedWeek === s.week ? 'default' : 'outline'}
            onClick={() => handleFilter(s.week)}
          >
            {s.week}{currentWeek === s.week ? ' ⭐' : ''}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">週次</th>
                <th className="p-2">期間</th>
                <th className="p-2">隊伍1</th>
                <th className="p-2">分數</th>
                <th className="p-2">隊伍2</th>
                <th className="p-2">分數</th>
                <th className="p-2">隊伍3</th>
                <th className="p-2">分數</th>
                <th className="p-2">隊伍4</th>
                <th className="p-2">分數</th>
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
