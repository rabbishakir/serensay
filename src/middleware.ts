import { unsealData } from "iron-session"
import { NextRequest, NextResponse } from "next/server"

import type { SessionData } from "@/lib/session"

const AUTH_COOKIE_NAME = "serene-session"

async function isLoggedIn(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const password = process.env.AUTH_SECRET

  if (!cookie || !password) {
    return false
  }

  try {
    const session = await unsealData<SessionData>(cookie, { password })
    return Boolean(session?.isLoggedIn)
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const loggedIn = await isLoggedIn(request)

  if (pathname === "/login") {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (!loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
}
