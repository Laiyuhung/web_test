// src/app/layout.js
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import GuardLayout from './guard'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata = {
  title: 'CPBL Fantasy',
  description: 'CPBL Fantasy',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GuardLayout>{children}</GuardLayout>
      </body>
    </html>
  )
}
