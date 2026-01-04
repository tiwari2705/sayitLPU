"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { User, LogIn } from "lucide-react"

export function Sidebar() {
  const { data: session } = useSession()

  return (
    <aside className="w-80 flex-shrink-0 hidden lg:block">
      <div className="sticky top-20 space-y-6">
        
        {/* Dynamic User Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          {session ? (
            // LOGGED IN VIEW
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {session.user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-white font-medium truncate max-w-[150px]">
                      {session.user?.email || "User"}
                    </p>
                    <p className="text-xs text-gray-400">Member</p>
                  </div>
               </div>
               {/* <Link href="/profile">
                 <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700">
                   <User className="w-4 h-4 mr-2"/>
                   My Profile
                 </Button>
               </Link> */}
            </div>
          ) : (
            // GUEST VIEW
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-2">
                 Join the Community
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                 Login to post anonymous confessions, like posts, and comment on others' secrets.
              </p>
              <Link href="/login">
                <Button className="w-full bg-white text-black hover:bg-gray-200">
                  <LogIn className="w-4 h-4 mr-2"/>
                  Login / Signup
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Info Section (Visible to Everyone) */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-3">
            Why Confess?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Confess your deepest, darkest secrets without worrying about anyone finding out your true ego. Be honest to strangers, we're all here to revel in our questionable life choices.
          </p>
        </div>

        {/* Links Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="space-y-3 text-sm">
            <Link 
              href="/user-agreement"  
              className="block text-gray-400 hover:text-white transition-colors"
            >
              User Agreement       
            </Link>
            <Link 
              href="/user-agreement#privacy-policy" 
              className="block text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-xs text-gray-500 text-center">
          © sayitLPU. All rights reserved.
        </div>
      </div>
    </aside>
  )
}