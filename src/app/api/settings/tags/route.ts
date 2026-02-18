import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const DEFAULT_TAGS = ["Stocked", "Order Arrived"]

const TagsSchema = z.object({
  tags: z.array(z.string().min(1).max(30)).max(20),
})

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "inventory_tags" },
      select: { value: true },
    })

    if (!setting) {
      return NextResponse.json({ tags: DEFAULT_TAGS })
    }

    try {
      const parsed = JSON.parse(setting.value) as unknown
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return NextResponse.json({ tags: parsed })
      }
      return NextResponse.json({ tags: DEFAULT_TAGS })
    } catch {
      return NextResponse.json({ tags: DEFAULT_TAGS })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch inventory tags."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof TagsSchema>
  try {
    const body = await req.json()
    parsed = TagsSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    await prisma.setting.upsert({
      where: { key: "inventory_tags" },
      update: { value: JSON.stringify(parsed.tags) },
      create: { key: "inventory_tags", value: JSON.stringify(parsed.tags) },
    })

    return NextResponse.json({ tags: parsed.tags })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save inventory tags."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
