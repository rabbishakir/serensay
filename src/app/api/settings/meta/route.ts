import { NextResponse } from "next/server"

import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
      orderBy: {
        key: "asc",
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings metadata."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
