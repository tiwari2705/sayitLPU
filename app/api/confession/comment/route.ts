import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware"
import { commentSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"
import { sanitizeText } from "@/lib/sanitize"

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error

    const body = await req.json()
    const { text, confessionId } = commentSchema.parse(body)

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

    const comment = await prisma.comment.create({
      data: {
        text: sanitizeText(text),
        confessionId,
        userId: user!.id,
      },
    })

    // Return anonymous comment
    return NextResponse.json(
      {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Comment error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

