'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_id='))
    if (!cookie) return

    const user_id = cookie.split('=')[1]

    supabase
      .from('managers')
      .select('name')
      .eq('id', user_id)
      .single()
      .then(({ data, error }) => {
        if (data?.name) {
          setUserName(data.name)
        } else {
          console.warn('無法取得名稱', error)
        }
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
      <div className="text-xl font-bold">Fantasy Baseball</div>
      <div className="flex items-center gap-4">
        <span>👤 歡迎 {userName || '...'}</span>
        <Link href="/home" className="hover:underline">
          Home
        </Link>
        <button onClick={handleLogout} className="hover:underline text-red-200">
          登出
        </button>
      </div>
    </nav>
  )
}
