'use client'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

export default function BulkInsertPage() {

  const todayStr = new Date().toISOString().split('T')[0]

  const [text, setText] = useState('')
  const [date, setDate] = useState(todayStr)
  const [isMajor, setIsMajor] = useState(true)
  const [isPitcher, setIsPitcher] = useState(false)

  const [moveText, setMoveText] = useState('')
  const [moveDate, setMoveDate] = useState(todayStr)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')

  const [starterName, setStarterName] = useState('')
  const [starterDate, setStarterDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [startingPitchers, setStartingPitchers] = useState([])

  
  const handleInsertStarter = async () => {
    if (!starterDate || !starterName) return
  
    const res = await fetch('/api/starting-pitcher/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: starterDate, name: starterName }),
    })
    const result = await res.json()
  
    if (res.ok) {
      setStarterName(starterName.trim())
      setDialogMessage('✅ 先發投手已登錄成功')
      setDialogOpen(true)
      await loadTomorrowStarters()
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
      setDialogOpen(true)
    }
  }
  
  const loadTomorrowStarters = async () => {
    const res = await fetch(`/api/starting-pitcher/load?date=${starterDate}`)
    const result = await res.json()
    if (res.ok) {
      setStartingPitchers(result)
    }
  }
  
  
  const handleSubmit = async () => {
    const endpoint = isPitcher ? '/api/pitching-insert' : '/api/bulk-insert'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date, isMajor }),
    })
    const result = await res.json()

    if (res.ok) {
      setText('')
      setDialogMessage('✅ 成績匯入成功，並已自動更新週得分。')
      await fetch('/api/updateWeeklyScores', { method: 'POST' })
    } else {
      setDialogMessage(`❌ 成績匯入失敗：${result.error || '請稍後再試。'}`)
    }
    setDialogOpen(true)
  }

  const handleMovementSubmit = async () => {
    const res = await fetch('/api/movement-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: moveText, date: moveDate }),
    })
    const result = await res.json()

    if (res.ok) {
      setMoveText('')
      setDialogMessage('✅ 異動登錄成功')
    } else {
      setDialogMessage(`❌ 異動失敗：${result.error || '請稍後再試。'}`)
    }
    setDialogOpen(true)
  }

  useEffect(() => {
    loadTomorrowStarters()
  }, [starterDate])

  return (
    <>
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
          placeholder="無須貼上日期"
          value={moveText}
          onChange={e => setMoveText(e.target.value)}
        />
        <Button onClick={handleMovementSubmit} className="mt-4">送出升降異動</Button>


        <h2 className="text-lg font-bold mt-10 mb-2">登錄先發投手（明日）</h2>
        <div className="mb-3 flex gap-3 flex-wrap items-center">
          <div>
            <label className="block text-sm mb-1">日期</label>
            <input
              type="date"
              className="border px-3 py-1 rounded"
              value={starterDate}
              onChange={(e) => setStarterDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">投手名稱</label>
            <input
              type="text"
              className="border px-3 py-1 rounded"
              placeholder="如：古林睿煬"
              value={starterName}
              onChange={(e) => setStarterName(e.target.value)}
            />
          </div>
          <Button onClick={handleInsertStarter}>送出先發投手</Button>
        </div>

        <div className="mt-4 text-sm">
          <span className="font-semibold">明日已登錄先發：</span>
          {startingPitchers.length === 0
            ? <span className="text-gray-500 ml-1">尚無資料</span>
            : startingPitchers.map((p, i) => (
                <span key={i} className="inline-block bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded mr-2 mt-1">
                  {p.name}
                </span>
              ))}
        </div>


      </div>

      {/* ✅ 提示結果 Dialog 共用 */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>操作結果</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDialogOpen(false)}>關閉</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
