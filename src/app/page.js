'use client'
import { useState } from 'react'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [userId, setUserId] = useState(null)
  const [elapsed, setElapsed] = useState(null)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    setUserId(null)
    setElapsed(null)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      })
      const result = await res.json()

      if (!res.ok || result.error) {
        setError(result.error || '登入失敗')
      } else {
        setUserId(result.id)
        setElapsed(result.duration)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>登入</h1>
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="帳號"
          value={account}
          onChange={e => setAccount(e.target.value)}
        />
        <input
          placeholder="密碼"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginLeft: 10 }}
        />
        <button onClick={handleLogin} style={{ marginLeft: 10 }}>
          登入
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 10 }}>
          ⚠️ 錯誤：{error}
        </div>
      )}

      {userId && (
        <div style={{ marginBottom: 10 }}>
          登入成功，使用者 id：{userId}
        </div>
      )}

      {elapsed !== null && (
        <div style={{ marginBottom: 10 }}>
          處理時間：{elapsed}ms
        </div>
      )}
    </div>
  )
}
