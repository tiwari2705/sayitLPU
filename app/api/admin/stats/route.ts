import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
export const dynamic = "force-dynamic";   // <--- ADD THIS
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const [
      totalUsers,
      pendingUsers,
      approvedUsers,
      totalConfessions,
      totalReports,
      totalLikes,
      totalComments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { status: "APPROVED" } }),
      prisma.confession.count({ where: { isRemoved: false } }),
      prisma.report.count(),
      prisma.like.count(),
      prisma.comment.count(),
    ])

    return NextResponse.json({
      stats: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        totalConfessions,
        totalReports,
        totalLikes,
        totalComments,
      },
    })
  } catch (error) {
    console.error("Get stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

