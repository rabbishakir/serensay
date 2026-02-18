import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const BdInventorySchema = z.object({
  productName: z.string().min(1, "Product name is required."),
  brand: z.string().optional(),
  shade: z.string().optional(),
  tags: z.array(z.string()).optional(),
  qty: z.number().int().optional(),
  buyPriceBdt: z.number().optional(),
  sellPriceBdt: z.number().optional(),
})

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search")?.trim()
  try {
    const items = await prisma.bdInventory.findMany({
      where: search
        ? {
            OR: [
              { productName: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { productName: "asc" },
    })
    return NextResponse.json(items)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch BD inventory."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof BdInventorySchema>
  try {
    const body = await req.json()
    parsed = BdInventorySchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const created = await prisma.bdInventory.create({
      data: {
        ...parsed,
        tags: parsed.tags ?? [],
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create BD inventory item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
