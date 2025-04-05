'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login') // 登出後導回登入頁
  }

  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
      <div className="text-xl font-bold">Fantasy Baseball</div>
      <div className="flex gap-4">
        <Link href="/home" className="hover:underline">Home</Link>
        <button onClick={handleLogout} className="hover:underline text-red-200">
          登出
        </button>
      </div>
    </nav>
  )
}
