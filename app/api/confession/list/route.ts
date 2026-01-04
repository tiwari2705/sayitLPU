import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth" // Use standard NextAuth to check session softly
import { authOptions } from "@/lib/auth"     // <--- VERIFY THIS PATH (it's where your NextAuth options are)
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // 1. CHANGE: Soft Auth Check (Optional Session)
    // Instead of requireAuth which blocks execution, we just ask "is there a session?"
    const session = await getServerSession(authOptions)
    const user = session?.user

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit
    const search = searchParams.get("search") || ""
    const sort = searchParams.get("sort") || "newest" 

    // Build where clause
    const where: any = {
      isRemoved: false,
    }

    if (search) {
      where.text = {
        contains: search,
        mode: "insensitive",
      }
    }

    const orderBy = sort === "newest" 
      ? { createdAt: "desc" as const }
      : undefined

    // 2. CHANGE: Conditional "Likes" Include
    // Only try to fetch specific user likes if we actually have a user ID.
    const likesInclude = user 
      ? { where: { userId: user.id }, select: { id: true } } 
      : undefined // If guest, do not try to fetch likes specific to a user

    const confessions = await prisma.confession.findMany({
      where,
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        // Apply the conditional include here
        likes: likesInclude as any, 
      },
      orderBy: orderBy || { createdAt: "desc" as const },
      skip: sort === "trending" ? 0 : skip,
      take: sort === "trending" ? 100 : limit,
    })

    // Sort logic (unchanged)
    let sortedConfessions = confessions
    if (sort === "trending") {
      sortedConfessions = confessions.sort((a, b) => {
        const aEngagement = a._count.likes + a._count.comments
        const bEngagement = b._count.likes + b._count.comments
        if (aEngagement === bEngagement) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return bEngagement - aEngagement
      })
      sortedConfessions = sortedConfessions.slice(skip, skip + limit)
    }

    // 3. CHANGE: Safe Mapping for isLiked
    // We check if 'confession.likes' exists before checking length (it will be undefined for guests)
    const anonymousConfessions = sortedConfessions.map((confession) => ({
      id: confession.id,
      text: confession.text,
      image: confession.image,
      likesCount: confession._count.likes,
      commentsCount: confession._count.comments,
      // If user is guest, 'likes' array is undefined, so isLiked becomes false.
      // If user is logged in, 'likes' array exists and we check if it has items.
      isLiked: confession.likes ? confession.likes.length > 0 : false,
      createdAt: confession.createdAt,
    }))

    return NextResponse.json({
      confessions: anonymousConfessions,
      page,
      limit,
    })
  } catch (error) {
    console.error("List confessions error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}