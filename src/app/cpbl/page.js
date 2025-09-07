// CPBL 比賽資訊頁面
'use client';
import { useEffect, useState } from 'react';

export default function CpblPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/cpbl')
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>載入中...</div>;
  if (error) return <div>發生錯誤: {error.message}</div>;

  // 顯示打擊成績表格
  const renderBattersTable = (batters, idx) => {
    if (!batters || batters.length === 0) return null;
    // 取所有欄位名稱（表頭）
    const columns = Object.keys(batters[0]);
    return (
      <div key={idx} style={{ marginBottom: 32 }}>
        <h2>打擊成績 {idx === 0 ? '主隊' : '客隊'}</h2>
        <table border="1" cellPadding={4} style={{ borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              {columns.map(col => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {batters.map((row, i) => (
              <tr key={i}>
                {columns.map(col => <td key={col}>{row[col]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>CPBL 比賽資訊</h1>
      {data?.battersData?.map?.((batters, idx) => renderBattersTable(batters, idx))}
    </main>
  );
}
