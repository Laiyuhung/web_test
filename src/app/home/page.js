'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const userId = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_id='))
    
    if (!userId) {
      router.replace('/login')
    }
  }, [])

  return (
    <div className="p-10">
      <h1>🏠 歡迎來到首頁！</h1>
    </div>
  )
}
