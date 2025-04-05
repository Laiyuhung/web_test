'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export default function PlayerPage() {
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/playerStatus')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlayers(data)
        } else {
          setError('資料格式錯誤')
        }
      })
      .catch(err => {
        console.error('API 錯誤:', err)
        setError('無法載入球員資料')
      })
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">球員狀態列表</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <Card>
        <CardContent className="overflow-auto p-4">
          <table className="w-full text-sm text-center border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">球員編號</th>
                <th className="p-2 border">球員姓名</th>
                <th className="p-2 border">狀態</th>
                <th className="p-2 border">所屬玩家</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={i}>
                  <td className="p-2 border">{p.Player_no}</td>
                  <td className="p-2 border">{p.Name}</td>
                  <td className="p-2 border">{p.status}</td>
                  <td className="p-2 border">{p.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
