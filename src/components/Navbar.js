'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import supabase from '@/lib/supabase'

export default function Navbar() {
  const [userName, setUserName] = useState('')
  const router = useRouter()

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
      .then(({ data }) => {
        if (data) setUserName(data.name)
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="flex justify-between items-center px-6 py-4 bg-gray-100 mb-4">
      <div className="text-lg font-bold">👤 歡迎 {userName}</div>
      <Button variant="destructive" onClick={handleLogout}>
        登出
      </Button>
    </div>
  )
}
