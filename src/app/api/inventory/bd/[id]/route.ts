import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const BdInventoryUpdateSchema = z.object({
  productName: z.string().min(1).optional(),
  brand: z.string().optional(),
  shade: z.string().optional(),
  tags: z.array(z.string()).optional(),
  qty: z.number().int().optional(),
  buyPriceBdt: z.number().optional(),
  sellPriceBdt: z.number().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.bdInventory.findUnique({
      where: { id: params.id },
    })
    if (!item) {
      return NextResponse.json({ error: "BD inventory item not found." }, { status: 404 })
    }
    return NextResponse.json(item)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch BD inventory item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let parsed: z.infer<typeof BdInventoryUpdateSchema>
  try {
    const body = await req.json()
    parsed = BdInventoryUpdateSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const data = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined)
  )

  try {
    const updated = await prisma.bdInventory.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update BD inventory item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await prisma.bdInventory.delete({
      where: { id: params.id },
    })
    return NextResponse.json(deleted)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete BD inventory item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
