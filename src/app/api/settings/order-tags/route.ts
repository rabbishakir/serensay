import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

const DEFAULT_ORDER_TAGS = ["delay-rev", "hold", "back-to-shelf", "urgent"]

const OrderTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(30)).max(20),
})

function parseStoredTags(value: string | null | undefined) {
  if (!value) return DEFAULT_ORDER_TAGS
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === "string")) {
      return parsed
    }
    return DEFAULT_ORDER_TAGS
  } catch {
    return DEFAULT_ORDER_TAGS
  }
}

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "order_tags" },
      select: { value: true },
    })

    return NextResponse.json({ tags: parseStoredTags(setting?.value) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch order tags."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  let parsed: z.infer<typeof OrderTagsSchema>
  try {
    const body = await req.json()
    parsed = OrderTagsSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    await prisma.setting.upsert({
      where: { key: "order_tags" },
      update: { value: JSON.stringify(parsed.tags) },
      create: { key: "order_tags", value: JSON.stringify(parsed.tags) },
    })

    return NextResponse.json({ tags: parsed.tags })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save order tags."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
