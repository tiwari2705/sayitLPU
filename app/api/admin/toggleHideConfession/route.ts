import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const toggleHideSchema = z.object({
  confessionId: z.string(),
  isHidden: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const body = await req.json()
    const { confessionId, isHidden } = toggleHideSchema.parse(body)

    const updated = await prisma.confession.update({
      where: { id: confessionId },
      data: { isHidden },
      select: { id: true, isHidden: true },
    })

    return NextResponse.json({
      message: updated.isHidden ? "Confession hidden" : "Confession unhidden",
      confessionId: updated.id,
      isHidden: updated.isHidden,
    })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    // Prisma "record not found"
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Confession not found" },
        { status: 404 }
      )
    }

    console.error("Toggle hide confession error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

