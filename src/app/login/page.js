// LoginPage.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // 自動檢查 localStorage，有登入就導回首頁
    const userId = localStorage.getItem('user_id') // 改為從 localStorage 取出 user_id
    if (userId) {
      router.push('/home')
    }
  }, [router])

  const handleLogin = async () => {
    setError('')
    setElapsed(null)

    const start = Date.now()
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      })
      const result = await res.json()
      const duration = Date.now() - start

      if (!res.ok || result.error) {
        setError(result.error || '登入失敗')
      } else {
        // 儲存 user_id 到 localStorage（這樣即便關閉瀏覽器也能保持登入狀態）
        localStorage.setItem('user_id', result.id)
        setElapsed(duration)
        router.push('/home')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-80">
        <h1 className="text-2xl font-bold mb-4 text-center">登入</h1>
        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="帳號"
          value={account}
          onChange={e => setAccount(e.target.value)}
        />
        <input
          className="w-full border p-2 mb-4 rounded"
          type="password"
          placeholder="密碼"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          登入
        </button>

        {error && <div className="text-red-600 mt-4">⚠️ {error}</div>}
      </div>
    </div>
  )
}
