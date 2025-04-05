'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_id='))
    if (!cookie) return
    const user_id = cookie.split('=')[1]

    console.log('👤 user_id from cookie:', user_id)

    fetch('/api/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ username API 回傳:', data)
        if (data.name) setUserName(data.name)
      })
      .catch(err => console.error('❌ username fetch 錯誤:', err))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-[#003366] text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-8">
        <div className="text-2xl font-bold tracking-wide">2025 CPBL FANTASY</div>
        <Link href="/home" className="font-semibold hover:text-gray-300">
          HOME
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        {userName && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-lg">👤</span> 歡迎 {userName}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-white hover:text-red-300"
        >
          登出
        </button>
      </div>
    </nav>
  )
}
