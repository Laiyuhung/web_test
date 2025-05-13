'use client'


import { useEffect, useState } from 'react'

export default function ManagerWeeklyStatsPage() {
  const [week, setWeek] = useState('2025-W19')
  const [data, setData] = useState([])
  const [selectedManager, setSelectedManager] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!week) return
    setIsLoading(true)
    fetch('/api/weekly_stats_by_manager/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week })
    })
      .then(res => res.json())
      .then(res => {
        if (res.error) throw new Error(res.error)
        setData(res)
        setSelectedManager(res[0]?.manager_id || null)
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [week])

  const selected = data.find(d => d.manager_id === selectedManager)

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Manager Weekly Stats Debug</h1>

      <label className="block mb-2">
        選擇週次：
        <input
          type="text"
          value={week}
          onChange={e => setWeek(e.target.value)}
          className="border p-1 ml-2"
        />
      </label>

      {error && <p className="text-red-600">❌ {error}</p>}

      {isLoading ? (
        <p>載入中...</p>
      ) : (
        <>
          <div className="my-4">
            {data.map(manager => (
              <button
                key={manager.manager_id}
                onClick={() => setSelectedManager(manager.manager_id)}
                className={`px-4 py-2 mr-2 mb-2 rounded ${selectedManager === manager.manager_id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                {manager.team_name}
              </button>
            ))}
          </div>

          {selected && (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selected.team_name}</h2>

              <div className="mb-6">
                <h3 className="font-bold">打者資料：</h3>
                <table className="w-full border mt-2 text-sm">
                  <thead>
                    <tr>
                      {selected.batterRows.length > 0 &&
                        Object.keys(selected.batterRows[0]).map(key => (
                          <th key={key} className="border px-2 py-1">{key}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.batterRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="border px-2 py-1 whitespace-nowrap">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-bold">投手資料：</h3>
                <table className="w-full border mt-2 text-sm">
                  <thead>
                    <tr>
                      {selected.pitcherRows.length > 0 &&
                        Object.keys(selected.pitcherRows[0]).map(key => (
                          <th key={key} className="border px-2 py-1">{key}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.pitcherRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="border px-2 py-1 whitespace-nowrap">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
