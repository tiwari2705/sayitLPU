"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Search, Building2 } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    // CHANGE: Redirect to feed (guest view) instead of login page
    router.push("/feed") 
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/feed?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <nav className="border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center gap-4 px-4">
        {/* Logo */}
        <Link href="/feed" className="flex items-center space-x-2 flex-shrink-0">
          <Building2 className="h-6 w-6 text-white" />
          <span className="font-bold text-xl text-white">sayitLPU</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search Confessions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-gray-700"
            />
          </div>
        </form>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-800" />
          ) : session ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="ghost" className="text-white hover:bg-gray-900">
                    Admin
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-gray-800 text-white hover:bg-gray-900"
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Guest View: Show Login Button
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-gray-200">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}