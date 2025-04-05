import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata = {
  title: 'CPBL Fantasy',
  description: 'CPBL Fantasy',
}

export default function RootLayout({ children }) {
  const cookieStore = cookies()
  const isLoggedIn = !!cookieStore.get('user_id')
  const path = typeof window === 'undefined' ? '' : window.location.pathname

  if (!isLoggedIn && path !== '/login') {
    redirect('/login') // 🔁 未登入導回登入頁
  }

  if (isLoggedIn && path === '/login') {
    redirect('/home') // 🔁 已登入導去首頁
  }

  const showNavbar = isLoggedIn && path !== '/login'

  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {showNavbar && <Navbar />}
        {children}
      </body>
    </html>
  )
}
