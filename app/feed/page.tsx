"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Flame, Clock, ArrowRight, Loader2, Calendar, Quote } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/sidebar"
import html2canvas from "html2canvas"

interface Confession {
  id: string
  text: string
  image?: string
  likesCount: number
  commentsCount: number
  isLiked?: boolean
  createdAt: string
}

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
  const reelRef = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // ---------------------------------------------------------
  // 1. NEW: Central Auth Check with Popup
  // ---------------------------------------------------------
  const checkAuth = (action: string) => {
    if (status !== "authenticated") {
      // The Alert / Confirmation Popup
      const wantsToLogin = window.confirm(`You need to login to ${action}. Would you like to login now?`)
      if (wantsToLogin) {
        router.push("/login")
      }
      return false // Stop execution
    }
    return true // Continue execution
  }

  useEffect(() => {
    if (status !== "loading") {
      const search = searchParams.get("search")
      fetchConfessions(search || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, sortBy, searchParams])

  const handleConfessionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setConfessionText(value)
    
    // Auto-resize logic
    const textarea = confessionTextareaRef.current
    if (textarea) {
      const maxHeight = 24 * 5 
      textarea.style.height = "auto"
      const newHeight = Math.min(textarea.scrollHeight, maxHeight)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden"
    }
  }

  // ---------------------------------------------------------
  // 2. NEW: Handle Input Focus (Clicking inside the box)
  // ---------------------------------------------------------
  const handleInputFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!checkAuth("post a confession")) {
      e.target.blur() // Remove focus so they can't type
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

        if (status === "authenticated") {
            const likedIds = new Set(
            fetchedConfessions
                .filter((conf: Confession & { isLiked?: boolean }) => conf.isLiked)
                .map((conf: Confession) => conf.id)
            )
            setLikedConfessions(likedIds)
        }
      }
    } catch (error) {
      console.error("Error fetching confessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostConfession = async () => {
    // ---------------------------------------------------------
    // 3. NEW: Check on Post Button Click
    // ---------------------------------------------------------
    if (!checkAuth("post")) return

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
        toast({ title: "Success", description: "Confession posted successfully!" })
        setConfessionText("")
        fetchConfessions()
      } else {
        toast({ title: "Error", description: data.error || "Failed to create confession", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" })
    } finally {
      setIsPosting(false)
    }
  }

  const handleLike = async (confessionId: string) => {
    // ---------------------------------------------------------
    // 4. NEW: Check on Like Button Click
    // ---------------------------------------------------------
    if (!checkAuth("like this post")) return

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
                likesCount: data.liked ? conf.likesCount + 1 : conf.likesCount - 1,
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

  // ---------------------------------------------------------
  // 5. NEW: Handle Comment Click
  // ---------------------------------------------------------
  const handleCommentClick = (confessionId: string) => {
    if (checkAuth("comment")) {
      router.push(`/confession/${confessionId}`)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    })
  }

  // --- DOWNLOAD LOGIC ---
  const handleDownloadReel = async (conf: Confession) => {
    const element = reelRef.current[conf.id]
    if (!element) {
      toast({ title: "Error", description: "Reel element not found", variant: "destructive" })
      return
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      const canvas = await html2canvas(element, { useCORS: true, scale: 2, backgroundColor: null })
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `sayitLPU-post-${conf.id}.png`
      link.click()
    } catch (err) {
      console.error("Failed to capture reel:", err)
      toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" })
    }
  }

  const getDynamicTextStyle = (text: string) => {
    const len = text.length
    if (len < 50) return { fontSize: 80, lineHeight: 1.3 }
    if (len < 150) return { fontSize: 60, lineHeight: 1.4 }
    if (len < 300) return { fontSize: 48, lineHeight: 1.4 }
    return { fontSize: 36, lineHeight: 1.5 }
  }

  if (status === "loading" && isLoading) {
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
            
            {/* POST INPUT: Visible to ALL, but triggers POPUP on click/focus */}
            <div className="mb-6">
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex items-start gap-3">
                <textarea
                  ref={confessionTextareaRef}
                  placeholder="Post a Confession"
                  value={confessionText}
                  onChange={handleConfessionChange}
                  onFocus={handleInputFocus} 
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 rounded-md p-3 min-h-[50px] resize-none focus:outline-none text-sm"
                  style={{ maxHeight: "120px" }}
                />
                <Button
                  onClick={handlePostConfession}
                  disabled={isPosting || !confessionText.trim()}
                  className="bg-white text-black hover:bg-gray-200 mt-1"
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Sort Buttons */}
            <div className="mb-6 flex gap-3">
              <Button
                variant={sortBy === "newest" ? "default" : "outline"}
                onClick={() => setSortBy("newest")}
                className={sortBy === "newest" ? "bg-white text-black hover:bg-gray-200" : "border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-white"}
              >
                <Clock className="h-4 w-4 mr-2" /> Newest
              </Button>
              <Button
                variant={sortBy === "trending" ? "default" : "outline"}
                onClick={() => setSortBy("trending")}
                className={sortBy === "trending" ? "bg-white text-black hover:bg-gray-200" : "border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-white"}
              >
                <Flame className="h-4 w-4 mr-2" /> Trending
              </Button>
            </div>

            {/* Confessions Feed */}
            <div className="space-y-6">
              {confessions.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800 py-12 text-center text-gray-400">
                  <p>No confessions yet. Be the first to confess!</p>
                </Card>
              ) : (
                confessions.map((confession) => (
                  <Card key={confession.id} className="bg-gray-900 border-gray-800 overflow-hidden flex flex-col">
                    <div className="p-6 pb-4 flex-1">
                      <div className="flex justify-end mb-3">
                        <span className="text-xs text-gray-400 font-medium flex items-center bg-gray-950/50 px-3 py-1.5 rounded-full border border-gray-800">
                          <Calendar className="w-3 h-3 mr-2" />
                          {formatDateTime(confession.createdAt)}
                        </span>
                      </div>
                      <p className="text-white whitespace-pre-wrap text-lg leading-relaxed mb-4">{confession.text}</p>
                      {confession.image && (
                        <div className="relative w-full h-72 rounded-lg overflow-hidden mt-4">
                          <Image src={confession.image} alt="Confession image" fill className="object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-800/30 p-5 border-t border-gray-800 mt-auto">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex gap-6">
                          
                          {/* LIKE BUTTON */}
                          <Button
                            variant="ghost"
                            onClick={() => handleLike(confession.id)}
                            className={`text-gray-400 hover:text-white hover:bg-gray-700/50 h-auto py-2 px-4 rounded-full transition-all ${
                              likedConfessions.has(confession.id) ? "text-red-500 hover:text-red-400 bg-red-500/10" : ""
                            }`}
                          >
                            <Heart className={`h-5 w-5 mr-2.5 ${likedConfessions.has(confession.id) ? "fill-current" : ""}`} />
                            <span className="font-medium">{confession.likesCount} Likes</span>
                          </Button>

                          {/* COMMENT BUTTON */}
                          <Button 
                            variant="ghost" 
                            onClick={() => handleCommentClick(confession.id)}
                            className="text-gray-400 hover:text-white hover:bg-gray-700/50 h-auto py-2 px-4 rounded-full transition-all"
                          >
                            <MessageCircle className="h-5 w-5 mr-2.5" />
                            <span className="font-medium">{confession.commentsCount} Comments</span>
                          </Button>

                        </div>

                        {session?.user?.role === "ADMIN" && (
                          <div className="flex items-center gap-3">
                            <Button onClick={() => handleDownloadReel(confession)} className="bg-white text-black hover:bg-gray-200">
                               Download Reel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hidden Reel Generator */}
                    <div ref={(el) => (reelRef.current[confession.id] = el)} style={{ position: "fixed", left: -20000, top: -20000, width: 1080, height: 1920, zIndex: 9999, background: "linear-gradient(160deg, #1e293b 0%, #0f172a 40%, #000000 100%)", color: "#ffffff", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", justifyContent: "space-between" }} aria-hidden>
                       <div style={{ padding: "80px 60px 0 60px", display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ width: 100, height: 100, background: "#fff", borderRadius: "20px", display: "flex", alignItems:"center", justifyContent:"center", overflow: "hidden" }}>
                           <div style={{ fontSize: 50, color: "#000", fontWeight: "bold" }}>LPU</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-1px" }}>sayitLPU</div>
                          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)" }}>Anonymous Confessions</div>
                        </div>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px", position: "relative" }}>
                        <div style={{ position: "absolute", top: "15%", left: "10%", opacity: 0.05, transform: "scale(10)" }}><Quote size={60} fill="white" /></div>
                        <div style={{ width: "100%", backgroundColor: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(10px)", border: "2px solid rgba(255, 255, 255, 0.1)", borderRadius: "40px", padding: "80px 60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
                          <div style={{ width: "100%", ...getDynamicTextStyle(confession.text), fontWeight: 600, whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: confession.text.length > 200 ? "left" : "center", color: "#fff", textShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>{confession.text}</div>
                        </div>
                        {confession.image && (
                          <div style={{ marginTop: "60px", width: "100%", height: "600px", borderRadius: "30px", overflow: "hidden", position: "relative", border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                            <img src={confession.image} alt="Confession visual" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> 
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "0 60px 80px 60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "40px", margin: "0 60px 60px 60px" }}>
                        <div>
                           <div style={{ fontSize: 32, fontWeight: 600, color: "#fff" }}>{new Date(confession.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                           <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{new Date(confession.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                           <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)" }}>Download the app</div>
                           <div style={{ fontSize: 32, fontWeight: "bold", color: "#3b82f6" }}>sayitLPU.com</div>
                        </div>
                      </div>
                    </div>

                  </Card>
                ))
              )}
            </div>
          </div>
          <Sidebar />
        </div>
      </div>
    </div>
  )
}

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