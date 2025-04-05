'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function GuardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  const [isLoggedIn, setIsLoggedIn] = useState(null)

  useEffect(() => {
    const hasCookie = document.cookie.includes('user_id=')
    setIsLoggedIn(hasCookie)

    if (!hasCookie && pathname !== '/login') {
      router.push('/login')
    } else if (hasCookie && pathname === '/login') {
      router.push('/home')
    }
  }, [pathname, router])

  if (isLoggedIn === null) return null // 等待判斷 cookie 完成

  const showNavbar = isLoggedIn && pathname !== '/login'

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  )
}
