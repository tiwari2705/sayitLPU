import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth" // Use soft auth check
import { authOptions } from "@/lib/auth"     // Verify this path matches your project
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. CHANGE: Soft Auth Check
    // We try to get the session, but we don't return an error if it's missing.
    const session = await getServerSession(authOptions)
    const user = session?.user
    const isAdmin = user?.role === "ADMIN"

    // 2. CHANGE: Conditional Logic for "Did I like this?"
    // If user is logged in, we check if they liked it. If guest, we skip that check.
    const likesInclude = user 
      ? { where: { userId: user.id }, select: { id: true } } 
      : undefined

    const confession = await prisma.confession.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        // Apply the conditional include
        likes: likesInclude as any,
        comments: {
          orderBy: {
            createdAt: "asc",
          },
          take: 50,
        },
      },
    })

    if (!confession || confession.isRemoved) {
      return NextResponse.json(
        { error: "Confession not found" },
        { status: 404 }
      )
    }
    if (confession.isHidden && !isAdmin) {
      return NextResponse.json(
        { error: "Confession not found" },
        { status: 404 }
      )
    }

    // 3. CHANGE: Safe Mapping
    // Return anonymous data, allowing guests to see comments
    return NextResponse.json({
      id: confession.id,
      text: confession.text,
      image: confession.image,
      likesCount: confession._count.likes,
      commentsCount: confession._count.comments,
      // If 'likes' array exists (logged in user), check length. If undefined (guest), return false.
      isLiked: confession.likes ? confession.likes.length > 0 : false,
      comments: confession.comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
      })),
      createdAt: confession.createdAt,
    })
  } catch (error) {
    console.error("Get confession error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}