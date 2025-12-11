"use client"

import { useEffect, useRef, useState, Suspense } from "react" // Added Suspense here
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, Flame, Clock, ArrowRight, Loader2, Calendar } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/sidebar"

interface Confession {
  id: string
  text: string
  image?: string
  likesCount: number
  commentsCount: number
  isLiked?: boolean
  createdAt: string
}

// 1. Renamed your original component to FeedContent and removed 'export default'
function FeedContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [confessions, setConfessions] = useState<Confession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [likedConfessions, setLikedConfessions] = useState<Set<string>>(new Set())
  const [confessionText, setConfessionText] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [sortBy, setSortBy] = useState<"newest" | "trending">("newest")
  const { toast } = useToast()
  const confessionTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      const search = searchParams.get("search")
      fetchConfessions(search || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, sortBy, searchParams])

  const handleConfessionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setConfessionText(value)

    const textarea = confessionTextareaRef.current
    if (textarea) {
      const maxHeight = 24 * 5 // approximately 5 lines at ~24px line height
      textarea.style.height = "auto"
      const newHeight = Math.min(textarea.scrollHeight, maxHeight)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden"
    }
  }

  const fetchConfessions = async (search?: string) => {
    try {
      const searchParam = search || searchParams.get("search") || ""
      const url = `/api/confession/list?page=1&limit=20&sort=${sortBy}${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ""}`
      const res = await fetch(url)
      const data = await res.json()

      if (res.ok) {
        let fetchedConfessions: Confession[] = data.confessions || []

        if (sortBy === "trending") {
            fetchedConfessions.sort((a, b) => {
                const scoreA = (a.likesCount || 0) + (a.commentsCount || 0)
                const scoreB = (b.likesCount || 0) + (b.commentsCount || 0)
                return scoreB - scoreA
            })
        } else {
            fetchedConfessions.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        }
        
        setConfessions(fetchedConfessions)

        const likedIds = new Set(
          fetchedConfessions
            .filter((conf: Confession & { isLiked?: boolean }) => conf.isLiked)
            .map((conf: Confession) => conf.id)
        )
        setLikedConfessions(likedIds)
      }
    } catch (error) {
      console.error("Error fetching confessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostConfession = async () => {
    if (!confessionText.trim() || confessionText.trim().length < 10) {
      toast({
        title: "Error",
        description: "Confession must be at least 10 characters long",
        variant: "destructive",
      })
      return
    }

    setIsPosting(true)
    try {
      const res = await fetch("/api/confession/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: confessionText }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "Success",
          description: "Confession posted successfully!",
        })
        setConfessionText("")
        fetchConfessions()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create confession",
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
      setIsPosting(false)
    }
  }

  const handleLike = async (confessionId: string) => {
    try {
      const res = await fetch("/api/confession/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId }),
      })

      const data = await res.json()

      if (res.ok) {
        setConfessions((prev) =>
          prev.map((conf) =>
            conf.id === confessionId
              ? {
                  ...conf,
                  likesCount: data.liked
                    ? conf.likesCount + 1
                    : conf.likesCount - 1,
                }
              : conf
          )
        )

        if (data.liked) {
          setLikedConfessions((prev) => new Set(prev).add(confessionId))
        } else {
          setLikedConfessions((prev) => {
            const newSet = new Set(prev)
            newSet.delete(confessionId)
            return newSet
          })
        }
      }
    } catch (error) {
      console.error("Error liking confession:", error)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Post Input */}
            <div className="mb-6">
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex items-start gap-3">
                <textarea
                  ref={confessionTextareaRef}
                  placeholder="Post a Confession"
                  value={confessionText}
                  onChange={handleConfessionChange}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 rounded-md p-3 min-h-[50px] resize-none focus:outline-none text-sm"
                  style={{ maxHeight: "120px" }}
                />
                <Button
                  onClick={handlePostConfession}
                  disabled={isPosting || !confessionText.trim()}
                  className="bg-white text-black hover:bg-gray-200 mt-1"
                >
                  {isPosting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Sort Buttons */}
            <div className="mb-6 flex gap-3">
              <Button
                variant={sortBy === "newest" ? "default" : "outline"}
                onClick={() => setSortBy("newest")}
                className={sortBy === "newest" 
                  ? "bg-white text-black hover:bg-gray-200" 
                  : "border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-white"
                }
              >
                <Clock className="h-4 w-4 mr-2" />
                Newest
              </Button>
              <Button
                variant={sortBy === "trending" ? "default" : "outline"}
                onClick={() => setSortBy("trending")}
                className={sortBy === "trending" 
                  ? "bg-white text-black hover:bg-gray-200" 
                  : "border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-white"
                }
              >
                <Flame className="h-4 w-4 mr-2" />
                Trending
              </Button>
            </div>

            {/* Confessions Feed */}
            <div className="space-y-6">
              {confessions.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                  <div className="py-12 text-center text-gray-400">
                    <p>No confessions yet. Be the first to confess!</p>
                  </div>
                </Card>
              ) : (
                confessions.map((confession) => (
                  <Card key={confession.id} className="bg-gray-900 border-gray-800 overflow-hidden flex flex-col">
                    
                    {/* --- TOP SECTION (2/3 WEIGHT) --- */}
                    <div className="p-6 pb-4 flex-1">
                        <div className="flex justify-end mb-3">
                            <span className="text-xs text-gray-400 font-medium flex items-center bg-gray-950/50 px-3 py-1.5 rounded-full border border-gray-800">
                            <Calendar className="w-3 h-3 mr-2" />
                            {formatDateTime(confession.createdAt)}
                            </span>
                        </div>

                        <p className="text-white whitespace-pre-wrap text-lg leading-relaxed mb-4">
                            {confession.text}
                        </p>
                        
                        {confession.image && (
                            <div className="relative w-full h-72 rounded-lg overflow-hidden mt-4">
                            <Image
                                src={confession.image}
                                alt="Confession image"
                                fill
                                className="object-cover"
                            />
                            </div>
                        )}
                    </div>

                    {/* --- BOTTOM SECTION (1/3 WEIGHT) --- */}
                    <div className="bg-gray-800/30 p-5 border-t border-gray-800 mt-auto">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex gap-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => handleLike(confession.id)}
                                    className={`text-gray-400 hover:text-white hover:bg-gray-700/50 h-auto py-2 px-4 rounded-full transition-all ${
                                        likedConfessions.has(confession.id) ? "text-red-500 hover:text-red-400 bg-red-500/10" : ""
                                    }`}
                                >
                                    <Heart
                                        className={`h-5 w-5 mr-2.5 ${
                                        likedConfessions.has(confession.id)
                                            ? "fill-current"
                                            : ""
                                        }`}
                                    />
                                    <span className="font-medium">{confession.likesCount} Likes</span>
                                </Button>
                                
                                <Link href={`/confession/${confession.id}`}>
                                    <Button
                                        variant="ghost"
                                        className="text-gray-400 hover:text-white hover:bg-gray-700/50 h-auto py-2 px-4 rounded-full transition-all"
                                    >
                                        <MessageCircle className="h-5 w-5 mr-2.5" />
                                        <span className="font-medium">{confession.commentsCount} Comments</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar />
        </div>
      </div>
    </div>
  )
}

// 2. Added this new default export wrapper
export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <FeedContent />
    </Suspense>
  )
}