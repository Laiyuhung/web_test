'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function BulkInsertPage() {
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [isMajor, setIsMajor] = useState(true)
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    setMessage('匯入中...')
    const res = await fetch('/api/bulk-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date, isMajor }),
    })
    const result = await res.json()
    if (res.ok) {
      setMessage(`✅ 成功匯入 ${result.count} 筆資料`)
      setText('')
    } else {
      setMessage(`❌ 錯誤：${result.error}`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">打者成績批次匯入</h1>

      <div className="mb-4 flex gap-4 items-center">
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
      </div>

      <textarea
        className="w-full h-96 border p-3 text-sm"
        placeholder="貼上數據..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Button onClick={handleSubmit} className="mt-4">送出</Button>
      {message && <div className="mt-4">{message}</div>}
    </div>
  )
}
