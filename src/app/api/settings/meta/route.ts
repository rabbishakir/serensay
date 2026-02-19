import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

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
