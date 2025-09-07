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

  return (
    <main style={{ padding: 24 }}>
      <h1>CPBL 比賽資訊</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
