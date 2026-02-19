import { NextResponse } from "next/server"

import { getIronSessionData } from "@/lib/session"

type LoginPayload = {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  let body: LoginPayload

  try {
    body = (await request.json()) as LoginPayload
  } catch {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 })
  }

  const username = body.username?.trim()
  const password = body.password

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 })
  }

  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD
  const moderatorUsername = process.env.MODERATOR_USERNAME
  const moderatorPassword = process.env.MODERATOR_PASSWORD

  let role: "admin" | "moderator" | null = null

  if (username === adminUsername && password === adminPassword) {
    role = "admin"
  } else if (username === moderatorUsername && password === moderatorPassword) {
    role = "moderator"
  }

  if (!role) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
  }

  const session = await getIronSessionData()
  session.isLoggedIn = true
  session.username = username
  session.role = role
  await session.save()

  return NextResponse.json({ success: true, role })
}
