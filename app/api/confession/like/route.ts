import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const likeSchema = z.object({
  confessionId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error

    const body = await req.json()
    const { confessionId } = likeSchema.parse(body)

    // Check if confession exists
    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
    })

    if (!confession || confession.isRemoved) {
      return NextResponse.json(
        { error: "Confession not found" },
        { status: 404 }
      )
    }
    if (confession.isHidden && user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Confession not found" },
        { status: 404 }
      )
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        confessionId_userId: {
          confessionId,
          userId: user!.id,
        },
      },
    })

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      })
      return NextResponse.json({ liked: false })
    } else {
      // Like
      await prisma.like.create({
        data: {
          confessionId,
          userId: user!.id,
        },
      })
      return NextResponse.json({ liked: true })
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Like error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

