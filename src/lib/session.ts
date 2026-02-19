import { getIronSession, type IronSession, type SessionOptions } from "iron-session"
import { cookies } from "next/headers"

export interface SessionData {
  isLoggedIn: boolean
  username: string
  role: "admin" | "moderator"
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
  username: "",
  role: "moderator",
}

export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET as string,
  cookieName: "serene-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
  },
}

export async function getIronSessionData(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), sessionOptions)
}

export async function getSession(request: Request): Promise<SessionData> {
  void request
  const session = await getIronSessionData()
  if (!session.isLoggedIn) {
    return defaultSession
  }

  return {
    isLoggedIn: true,
    username: session.username ?? "",
    role: session.role === "admin" ? "admin" : "moderator",
  }
}
