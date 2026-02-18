import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const MoveSchema = z.object({
  qty: z.number().int().positive("Qty must be greater than 0."),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let parsed: z.infer<typeof MoveSchema>
  try {
    const body = await req.json()
    parsed = MoveSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const moved = await prisma.$transaction(async (tx) => {
      const usaItem = await tx.usaInventory.findUnique({
        where: { id: params.id },
      })
      if (!usaItem) {
        throw new Error("USA inventory item not found.")
      }

      if (parsed.qty > usaItem.qty) {
        throw new Error("Qty cannot exceed current USA inventory qty.")
      }

      const remainingQty = usaItem.qty - parsed.qty
      if (remainingQty === 0) {
        await tx.usaInventory.delete({ where: { id: usaItem.id } })
      } else {
        await tx.usaInventory.update({
          where: { id: usaItem.id },
          data: { qty: remainingQty },
        })
      }

      const existingBd = await tx.bdInventory.findFirst({
        where: {
          productName: usaItem.productName,
          brand: usaItem.brand,
          shade: usaItem.shade,
        },
      })

      if (existingBd) {
        const bdItem = await tx.bdInventory.update({
          where: { id: existingBd.id },
          data: { qty: existingBd.qty + parsed.qty },
        })
        return bdItem
      }

      return tx.bdInventory.create({
        data: {
          productName: usaItem.productName,
          brand: usaItem.brand,
          shade: usaItem.shade,
          tags: usaItem.tags,
          qty: parsed.qty,
          buyPriceBdt: null,
        },
      })
    })

    return NextResponse.json({ moved: parsed.qty, bdItem: moved })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to move inventory to BD."
    const status =
      message === "USA inventory item not found."
        ? 404
        : message === "Qty cannot exceed current USA inventory qty."
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
