'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'

export default function HomePage() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSchedules() {
      const { data, error } = await supabase.from('schedule').select('*').order('week')
      if (error) {
        console.error('❌ 讀取 schedule 失敗：', error.message)
      } else {
        setSchedules(data)
      }
      setLoading(false)
    }
    fetchSchedules()
  }, [])

  if (loading) return <div className="p-6">讀取中...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">賽季賽程表</h1>
      <table className="w-full border-collapse border border-gray-400 text-center text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">週次</th>
            <th className="border px-2 py-1">期間</th>
            <th className="border px-2 py-1">隊伍1</th>
            <th className="border px-2 py-1">分數</th>
            <th className="border px-2 py-1">隊伍2</th>
            <th className="border px-2 py-1">分數</th>
            <th className="border px-2 py-1">隊伍3</th>
            <th className="border px-2 py-1">分數</th>
            <th className="border px-2 py-1">隊伍4</th>
            <th className="border px-2 py-1">分數</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s, i) => (
            <tr key={i}>
              <td className="border px-2 py-1">{s.week}</td>
              <td className="border px-2 py-1">{s.date_range}</td>
              <td className="border px-2 py-1">{s.team1}</td>
              <td className="border px-2 py-1">{s.score1}</td>
              <td className="border px-2 py-1">{s.team2}</td>
              <td className="border px-2 py-1">{s.score2}</td>
              <td className="border px-2 py-1">{s.team3}</td>
              <td className="border px-2 py-1">{s.score3}</td>
              <td className="border px-2 py-1">{s.team4}</td>
              <td className="border px-2 py-1">{s.score4}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
