import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
export const dynamic = "force-dynamic";   // <--- ADD THIS
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const reports = await prisma.report.findMany({
      include: {
        confession: {
          select: {
            id: true,
            text: true,
            image: true,
            createdAt: true,
            isRemoved: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Get reports error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

