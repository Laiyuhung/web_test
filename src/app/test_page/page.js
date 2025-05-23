'use client'
import { useState } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 space-y-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 rounded-full shadow-md bg-white hover:bg-gray-100 border border-gray-300 text-xl font-bold"
        >
          -
        </button>

        <span className="text-3xl font-semibold w-12 text-center">{count}</span>

        <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#5D4037] hover:bg-[#4E342E] shadow">
          {/* <Cog6ToothIcon className="w-6 h-6 text-white" /> */}
          <span className="text-white font-medium">+</span>
        </button>
      </div>

      <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#5D4037] hover:bg-[#4E342E] shadow">
        <Cog6ToothIcon className="w-6 h-6 text-white" />
        <span className="text-white font-medium">Settings</span>
      </button>
    </main>
  )
}
