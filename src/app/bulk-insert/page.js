'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"


export default function BulkInsertPage() {
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [isMajor, setIsMajor] = useState(true)
  const [isPitcher, setIsPitcher] = useState(false)

  const [moveText, setMoveText] = useState('')
  const [moveDate, setMoveDate] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    setMessage('匯入中...')
    const endpoint = isPitcher ? '/api/pitching-insert' : '/api/bulk-insert'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date, isMajor }),
    })
    const result = await res.json()
    if (res.ok) {
      setText('')
      toast({
        title: "✅ 匯入成功",
        description: "已成功匯入數據，並自動更新週得分。",
      })

      // ✅ 在這裡加上觸發「更新週得分」的 API
      await fetch('/api/updateWeeklyScores', { method: 'POST' })

    } else {
      setMessage(`❌ 錯誤：${result.error}`)
    }
  }

  const handleMovementSubmit = async () => {
    setMessage('異動登錄中...')
    const res = await fetch('/api/movement-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: moveText, date: moveDate }),
    })
    const result = await res.json()
    if (res.ok) {
      setMessage('✅ 異動匯入成功')
      setMoveText('')
    } else {
      setMessage(`❌ 錯誤：${result.error}`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">成績批次匯入</h1>

      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <div>
          <label className="block text-sm mb-1">比賽日期</label>
          <input
            type="date"
            className="border px-3 py-1 rounded"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">一軍</label>
          <select
            className="border px-3 py-1 rounded"
            value={isMajor ? '1' : '0'}
            onChange={e => setIsMajor(e.target.value === '1')}
          >
            <option value="1">是</option>
            <option value="0">否</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">匯入類型</label>
          <select
            className="border px-3 py-1 rounded"
            value={isPitcher ? 'pitcher' : 'batter'}
            onChange={e => setIsPitcher(e.target.value === 'pitcher')}
          >
            <option value="batter">打者</option>
            <option value="pitcher">投手</option>
          </select>
        </div>
      </div>

      <textarea
        className="w-full h-96 border p-3 text-sm"
        placeholder="貼上打者或投手數據..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Button onClick={handleSubmit} className="mt-4">送出</Button>

      {/* 🔽 升降異動欄位 */}
      <h2 className="text-lg font-bold mt-10 mb-2">球員升降登錄</h2>
      <div className="mb-3">
        <label className="block text-sm mb-1">異動日期</label>
        <input
          type="date"
          className="border px-3 py-1 rounded"
          value={moveDate}
          onChange={e => setMoveDate(e.target.value)}
        />
      </div>
      <textarea
        className="w-full h-64 border p-3 text-sm"
        placeholder="貼上格式：\n林智勝	降二軍\n伍鐸	升一軍"
        value={moveText}
        onChange={e => setMoveText(e.target.value)}
      />
      <Button onClick={handleMovementSubmit} className="mt-4">送出升降異動</Button>

      {message && <div className="mt-4">{message}</div>}
    </div>
  )
}
