'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_id='))
    if (!cookie) return
    const id = cookie.split('=')[1]
    setUserId(id)

    fetch('/api/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id }),
    })
      .then(res => res.json())
      .then(data => {
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
      {/* Logo Section */}
      <div className="flex items-center space-x-8">
        <div className="text-sm font-bold tracking-wide whitespace-nowrap">2025 CPBL FANTASY</div>
      </div>

      {/* Menu for larger screens */}
      <div className="hidden md:flex items-center space-x-8">
        <Link href="/home" className="font-semibold hover:text-gray-300">HOME</Link>
        <Link href="/player" className="font-semibold hover:text-gray-300">PLAYERS</Link>
        {userId === '2' && (
          <Link href="/bulk-insert" className="font-semibold hover:text-yellow-300">資料登錄系統</Link>
        )}
      </div>

      {/* Hamburger Menu for smaller screens */}
      <div className="md:hidden flex items-center">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu for small screens */}
      {menuOpen && (
        <div className="absolute top-0 right-0 w-1/2 bg-[#003366] text-white p-4 md:hidden">
          <Link href="/home" className="block py-2">HOME</Link>
          <Link href="/player" className="block py-2">PLAYERS</Link>
          {userId === '2' && (
            <Link href="/bulk-insert" className="block py-2">資料登錄系統</Link>
          )}
        </div>
      )}

      {/* User and Logout Section */}
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
          Logout
        </button>
      </div>
    </nav>
  )
}
