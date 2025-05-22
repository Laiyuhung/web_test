'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(null)
  const router = useRouter()

  // ✅ 一進頁面檢查 cookie 中是否有 user_id（用於保持登入狀態）
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('user_id='))
    const userId = cookie?.split('=')[1]
    if (!userId) return

    fetch('/api/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data?.name) {
          router.push('/home') // ✅ 驗證成功才導向首頁
        }
      })
      .catch(() => {}) // 驗證失敗不處理
  }, [router])

  // ✅ 登入後由後端設置 cookie，前端不用再儲存任何東西
  const handleLogin = async () => {
    setError('')
    setElapsed(null)

    const start = Date.now()
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ⬅️ 建議加上這行，確保 cookie 正確處理（雖然不是必要）
        body: JSON.stringify({ account, password }),
      })

      const result = await res.json()
      const duration = Date.now() - start

      if (!res.ok || result.error) {
        setError(result.error || '登入失敗')
      } else {
        setElapsed(duration)
        router.push('/home') // ✅ cookie 驗證即可，不用存 localStorage
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
