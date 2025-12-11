import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
export const dynamic = "force-dynamic";   // <--- ADD THIS
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit
    const search = searchParams.get("search") || ""
    const sort = searchParams.get("sort") || "newest" // newest, trending

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

    // For trending, we need to fetch all and sort by engagement
    // For newest, we can use Prisma's orderBy
    const orderBy = sort === "newest" 
      ? { createdAt: "desc" as const }
      : undefined

    // Fetch confessions with user's likes
    const confessions = await prisma.confession.findMany({
      where,
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            userId: user!.id,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: orderBy || { createdAt: "desc" as const }, // Default to newest if no orderBy
      skip: sort === "trending" ? 0 : skip, // For trending, fetch more to sort properly
      take: sort === "trending" ? 100 : limit, // Fetch more for trending to get accurate results
    })

    // For trending, sort by total engagement (likes + comments)
    let sortedConfessions = confessions
    if (sort === "trending") {
      sortedConfessions = confessions.sort((a, b) => {
        const aEngagement = a._count.likes + a._count.comments
        const bEngagement = b._count.likes + b._count.comments
        // If engagement is equal, sort by newest
        if (aEngagement === bEngagement) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return bEngagement - aEngagement
      })
      // Apply pagination after sorting
      sortedConfessions = sortedConfessions.slice(skip, skip + limit)
    }

    // Return anonymous data - no author info, but include liked status
    const anonymousConfessions = sortedConfessions.map((confession) => ({
      id: confession.id,
      text: confession.text,
      image: confession.image,
      likesCount: confession._count.likes,
      commentsCount: confession._count.comments,
      isLiked: confession.likes.length > 0,
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

