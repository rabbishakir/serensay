import { NextResponse } from "next/server"

import { getSession } from "@/lib/session"

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 })
  }

  return NextResponse.json({
    isLoggedIn: true,
    username: session.username,
    role: session.role,
  })
}
