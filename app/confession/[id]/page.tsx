"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, Flag, Loader2, Send } from "lucide-react"
import html2canvas from "html2canvas";


interface Comment {
  id: string
  text: string
  createdAt: string
}

interface Confession {
  id: string
  text: string
  image?: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  comments: Comment[]
  createdAt: string
}

function ConfessionDetailSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 max-w-3xl px-4 space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 w-32 rounded bg-gray-800 animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-gray-800 animate-pulse" />
                <div className="h-4 w-11/12 rounded bg-gray-800 animate-pulse" />
                <div className="h-4 w-8/12 rounded bg-gray-800 animate-pulse" />
              </div>
              <div className="h-96 w-full rounded-lg bg-gray-800 animate-pulse" />
              <div className="flex items-center space-x-4 pt-2 border-t border-gray-800">
                <div className="h-9 w-20 rounded bg-gray-800 animate-pulse" />
                <div className="h-9 w-24 rounded bg-gray-800 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="h-5 w-40 rounded bg-gray-800 animate-pulse mb-6" />
            <div className="flex space-x-2 mb-6">
              <div className="h-16 flex-1 rounded bg-gray-800 animate-pulse" />
              <div className="h-10 w-10 rounded bg-gray-800 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-14 w-full rounded bg-gray-800 animate-pulse" />
              <div className="h-14 w-full rounded bg-gray-800 animate-pulse" />
              <div className="h-14 w-full rounded bg-gray-800 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ConfessionDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [confession, setConfession] = useState<Confession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchConfession()
    }
  }, [status, router, params.id])

  const fetchConfession = async () => {
    try {
      const res = await fetch(`/api/confession/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setConfession(data)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load confession",
          variant: "destructive",
        })
        router.push("/feed")
      }
    } catch (error) {
      console.error("Error fetching confession:", error)
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async () => {
    if (!confession) return

    try {
      const res = await fetch("/api/confession/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId: confession.id }),
      })

      const data = await res.json()

      if (res.ok) {
        setConfession((prev) =>
          prev
            ? {
                ...prev,
                isLiked: data.liked,
                likesCount: data.liked
                  ? prev.likesCount + 1
                  : prev.likesCount - 1,
              }
            : null
        )
      }
    } catch (error) {
      console.error("Error liking confession:", error)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confession || !commentText.trim()) return

    setIsSubmittingComment(true)

    try {
      const res = await fetch("/api/confession/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commentText,
          confessionId: confession.id,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setCommentText("")
        setConfession((prev) =>
          prev
            ? {
                ...prev,
                comments: [...prev.comments, data],
                commentsCount: prev.commentsCount + 1,
              }
            : null
        )
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to post comment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleReport = async () => {
    if (!confession) return

    const reason = prompt("Please provide a reason for reporting this confession:")

    if (!reason || reason.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please provide a valid reason (at least 10 characters)",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/confession/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId: confession.id, reason }),
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Report submitted successfully",
        })
      } else {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.error || "Failed to submit report",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (status === "loading" || isLoading) {
    return <ConfessionDetailSkeleton />
  }

  if (!confession) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 max-w-3xl px-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                {formatDistanceToNow(new Date(confession.createdAt), {
                  addSuffix: true,
                })}
              </p>
              <p className="whitespace-pre-wrap text-lg text-white leading-relaxed">{confession.text}</p>
              {confession.image && (
                <div className="relative w-full h-96 rounded-lg overflow-hidden">
                  <Image
                    src={confession.image}
                    alt="Confession image"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex items-center space-x-4 pt-2 border-t border-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`text-gray-400 hover:text-white hover:bg-gray-800 ${
                    confession.isLiked ? "text-red-500" : ""
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${
                      confession.isLiked ? "fill-current" : ""
                    }`}
                  />
                  {confession.likesCount}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleReport}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Comments ({confession.commentsCount})
            </h3>
            <form onSubmit={handleComment} className="mb-6">
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  rows={2}
                />
                <Button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
            <div className="space-y-4">
              {confession.comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                confession.comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-800 pb-4 last:border-0">
                    <p className="text-sm text-gray-400 mb-2">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="whitespace-pre-wrap text-white">{comment.text}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

