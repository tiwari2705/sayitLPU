import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    // Optional session (guest allowed)
    const session = await getServerSession(authOptions)
    const user = session?.user
    const isAdmin = user?.role === "ADMIN"

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit
    const search = searchParams.get("search") || ""
    const sort = searchParams.get("sort") || "newest"

    // WHERE clause
    const where: {
      isRemoved: boolean
      isHidden?: boolean
      text?: {
        contains: string
        mode: "insensitive"
      }
    } = {
      isRemoved: false,
    }

    if (!isAdmin) {
      where.isHidden = false
    }

    if (search) {
      where.text = {
        contains: search,
        mode: "insensitive",
      }
    }

    // Prisma include (🔥 FIXED)
    const include = {
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      likes: user
        ? { where: { userId: user.id }, select: { id: true } }
        : false,
      ...(isAdmin && {
        author: { select: { id: true, email: true } },
      }),
    }

    const confessions = await prisma.confession.findMany({
      where,
      include,
      orderBy: sort === "newest" ? { createdAt: "desc" } : undefined,
      skip: sort === "trending" ? 0 : skip,
      take: sort === "trending" ? 100 : limit,
    })

    // Trending sort
    let sortedConfessions = confessions
    if (sort === "trending") {
      sortedConfessions = [...confessions]
        .sort((a, b) => {
          const aEngagement = a._count.likes + a._count.comments
          const bEngagement = b._count.likes + b._count.comments

          if (aEngagement === bEngagement) {
            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            )
          }
          return bEngagement - aEngagement
        })
        .slice(skip, skip + limit)
    }

    // Response mapping
    const response = sortedConfessions.map((confession) => {
      const base = {
        id: confession.id,
        text: confession.text,
        image: confession.image,
        likesCount: confession._count.likes,
        commentsCount: confession._count.comments,
        isLiked: confession.likes ? confession.likes.length > 0 : false,
        createdAt: confession.createdAt,
      }

      if (!isAdmin) return base

      return {
        ...base,
        isHidden: confession.isHidden,
        author: confession.author
          ? { id: confession.author.id, email: confession.author.email }
          : null,
      }
    })

    return NextResponse.json({
      confessions: response,
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
