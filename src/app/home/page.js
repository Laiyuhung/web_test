'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'

export default function HomePage() {
  const [schedules, setSchedules] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selectedWeek, setSelectedWeek] = useState('All')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  // 自動抓 cookie 裡的 user_id 並撈名字
  useEffect(() => {
    const fetchUser = async () => {
      const id = document.cookie
        .split('; ')
        .find(row => row.startsWith('user_id='))
        ?.split('=')[1]

      if (id) {
        const { data } = await supabase.from('managers').select('name').eq('id', id).single()
        setUserName(data?.name || '')
      }
    }
    fetchUser()
  }, [])

  // 抓所有賽程資料
  useEffect(() => {
    async function fetchSchedules() {
      const { data, error } = await supabase.from('schedule').select('*').order('week')
      if (error) {
        console.error('❌ 讀取 schedule 失敗：', error.message)
      } else {
        setSchedules(data)
        setFiltered(data)
      }
      setLoading(false)
    }
    fetchSchedules()
  }, [])

  // 根據系統時間判斷本週週次（比對 start/end date）
  const getCurrentWeek = () => {
    const today = new Date()
    return schedules.find(s => {
      const start = new Date(s.start)
      const end = new Date(s.end_date)
      return today >= start && today <= end
    })?.week
  }

  // 切換週次（全部 or 本週）
  const handleWeekFilter = (week) => {
    setSelectedWeek(week)
    if (week === 'All') setFiltered(schedules)
    else {
      const w = getCurrentWeek()
      const match = schedules.filter(s => s.week === w)
      setFiltered(match)
    }
  }

  if (loading) return <div className="p-6">讀取中...</div>

  return (
    <div className="p-6">
      <div className="flex items-center mb-4 space-x-4">
        <User className="text-purple-700" />
        <span className="font-bold text-lg">歡迎 {userName}</span>
        <Button
          variant={selectedWeek === 'All' ? 'default' : 'outline'}
          onClick={() => handleWeekFilter('All')}
        >
          全部週次
        </Button>
        <Button
          variant={selectedWeek === 'This week' ? 'default' : 'outline'}
          onClick={() => handleWeekFilter('This week')}
        >
          This week
        </Button>
      </div>

      {filtered.map((s, i) => (
        <Card className="mb-3" key={i}>
          <CardContent className="p-4">
            <div className="font-bold mb-2">{s.week}（{s.date_range}）</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>{s.team1}：{s.score1}</div>
              <div>{s.team2}：{s.score2}</div>
              <div>{s.team3}：{s.score3}</div>
              <div>{s.team4}：{s.score4}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
