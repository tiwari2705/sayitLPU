import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
export const dynamic = "force-dynamic";   // <--- ADD THIS
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null

    const where = status ? { status } : {}

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        idCardFileKey: true,
        status: true,
        isBanned: true,
        createdAt: true,
        _count: {
          select: { confessions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // 👇 Add formatted URL for preview — matches your admin UI exactly
    const formatted = users.map((u) => ({
      ...u,
      idCardUrl: u.idCardFileKey ? `https://utfs.io/f/${u.idCardFileKey}` : null,
    }))

    return NextResponse.json({ users: formatted })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
