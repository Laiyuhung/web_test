// ✅ src/components/Navbar.js
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-blue-600 p-4 text-white flex gap-4">
      <Link href="/home" className="hover:underline">Home</Link>
      <Link href="/login" className="hover:underline">Login</Link>
    </nav>
  )
}