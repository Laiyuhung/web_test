'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function GuardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const loggedIn = document.cookie.includes('user_id=')
    setIsLoggedIn(loggedIn)
    setIsReady(true)

    if (!loggedIn && pathname !== '/login') {
      router.push('/login')
    } else if (loggedIn && pathname === '/login') {
      router.push('/home')
    }
  }, [pathname, router])

  if (!isReady) return null

  const showNavbar = isLoggedIn && pathname !== '/login'

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  )
}
