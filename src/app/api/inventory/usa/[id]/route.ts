import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const UsaInventoryUpdateSchema = z.object({
  productName: z.string().min(1).optional(),
  brand: z.string().optional(),
  shade: z.string().optional(),
  qty: z.number().int().optional(),
  buyPriceUsd: z.number().optional(),
  weightG: z.number().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let parsed: z.infer<typeof UsaInventoryUpdateSchema>
  try {
    const body = await req.json()
    parsed = UsaInventoryUpdateSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const data = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined)
  )

  try {
    const updated = await prisma.usaInventory.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update USA inventory item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await prisma.usaInventory.delete({
      where: { id: params.id },
    })
    return NextResponse.json(deleted)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete USA inventory item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
