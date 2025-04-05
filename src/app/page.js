'use client'
import { useEffect, useState } from 'react'

export default function Home() {
  const [data, setData] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(result => {
        if (result.error) {
          setError(result.error)
        } else {
          setData(result.data)
        }
      })
      .catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ padding: 40 }}>
      <h1>Supabase 測試</h1>
      {error && <div style={{ color: 'red' }}>⚠️ 錯誤：{error}</div>}

      <ul>
        {data.map((item, i) => (
          <li key={i}>{item.name} - {item.age}</li>
        ))}
      </ul>
    </div>
  )
}
