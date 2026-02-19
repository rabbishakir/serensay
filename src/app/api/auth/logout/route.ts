import { NextResponse } from "next/server"

import { getIronSessionData } from "@/lib/session"

export async function POST() {
  const session = await getIronSessionData()
  session.destroy()
  return NextResponse.json({ success: true })
}
