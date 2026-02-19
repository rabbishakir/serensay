import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

const UpsertSettingSchema = z.object({
  key: z.string().min(1, "Key is required."),
  value: z.string(),
})

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  try {
    const settings = await prisma.setting.findMany()
    const result = settings.reduce<Record<string, string>>((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {})
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  let parsed: z.infer<typeof UpsertSettingSchema>
  try {
    const body = await req.json()
    parsed = UpsertSettingSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const updated = await prisma.setting.upsert({
      where: { key: parsed.key },
      update: { value: parsed.value },
      create: {
        key: parsed.key,
        value: parsed.value,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save setting."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
