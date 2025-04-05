'use client'
import { useState } from 'react'

export default function Home() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [tableData, setTableData] = useState([])
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, age }),
      })
      const result = await res.json()

      if (result.error) {
        setError(result.error)
      } else {
        setTableData(result.data)
        setError('')
        setName('')
        setAge('')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>App Router 表格測試</h1>
      <input placeholder="名字" value={name} onChange={e => setName(e.target.value)} />
      <input
        placeholder="年齡"
        type="number"
        value={age}
        onChange={e => setAge(e.target.value)}
        style={{ marginLeft: 10 }}
      />
      <button onClick={handleSubmit} style={{ marginLeft: 10 }}>送出</button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>⚠️ 錯誤：{error}</div>}

      <table border="1" cellPadding="8" style={{ marginTop: 20 }}>
        <thead>
          <tr><th>名字</th><th>年齡</th></tr>
        </thead>
        <tbody>
          {tableData.map((item, i) => (
            <tr key={i}>
              <td>{item.name}</td>
              <td>{item.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
