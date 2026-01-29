import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware"
import { reportSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"
import { sanitizeText } from "@/lib/sanitize"

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error

    const body = await req.json()
    const { confessionId, reason } = reportSchema.parse(body)

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

    // Check if already reported by this user
    const existingReport = await prisma.report.findFirst({
      where: {
        confessionId,
        reporterId: user!.id,
      },
    })

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this confession" },
        { status: 400 }
      )
    }

    await prisma.report.create({
      data: {
        confessionId,
        reason: sanitizeText(reason),
        reporterId: user!.id,
      },
    })

    return NextResponse.json(
      { message: "Report submitted successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Report error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

