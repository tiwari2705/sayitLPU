"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PendingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userStatus, setUserStatus] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      checkStatus()
    }
  }, [status, router])

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/auth/checkStatus")
      const data = await res.json()

      if (data.status === "APPROVED") {
        router.push("/feed")
      } else if (data.status === "REJECTED") {
        setUserStatus("REJECTED")
      } else {
        setUserStatus("PENDING")
      }
    } catch (error) {
      console.error("Error checking status:", error)
    }
  }

  if (status === "loading" || !userStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">
            {userStatus === "PENDING" ? "Waiting for Approval" : "Account Rejected"}
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            {userStatus === "PENDING"
              ? "Your account is pending admin approval. Please check back later."
              : "Your account has been rejected. Please contact support if you believe this is an error."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userStatus === "PENDING" && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-white" />
              <p className="text-sm text-gray-400">
                We&apos;ll notify you once your account is approved.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

