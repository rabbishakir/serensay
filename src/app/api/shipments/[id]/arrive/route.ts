import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/db"

const ShipmentStockItemSchema = z.object({
  usaInventoryId: z.string().min(1),
  productName: z.string().min(1),
  brand: z.string().nullable(),
  shade: z.string().nullable(),
  qtyToShip: z.number().int().positive(),
  buyPriceUsd: z.number().nullable(),
  weightG: z.number().nullable(),
})

type ShipmentStockItem = z.infer<typeof ShipmentStockItemSchema>

function parseStockItems(raw: unknown): ShipmentStockItem[] {
  if (!Array.isArray(raw)) return []
  const parsed = z.array(ShipmentStockItemSchema).safeParse(raw)
  if (!parsed.success) return []
  return parsed.data
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          stockItems: true,
        },
      })

      if (!shipment) {
        throw new Error("SHIPMENT_NOT_FOUND")
      }

      const stockItems = parseStockItems(shipment.stockItems)

      const ordersUpdated = await tx.order.updateMany({
        where: { batchId: params.id },
        data: { status: "IN_BANGLADESH" },
      })

      let stockItemsMoved = 0

      for (const stockItem of stockItems) {
        const usaItem = await tx.usaInventory.findUnique({
          where: { id: stockItem.usaInventoryId },
        })

        if (!usaItem) {
          throw new Error(`USA_ITEM_NOT_FOUND:${stockItem.usaInventoryId}`)
        }

        if (stockItem.qtyToShip > usaItem.qty) {
          throw new Error(`QTY_EXCEEDS_STOCK:${stockItem.productName}`)
        }

        const existingBd = await tx.bdInventory.findFirst({
          where: {
            productName: { equals: stockItem.productName, mode: "insensitive" },
            brand: stockItem.brand
              ? { equals: stockItem.brand, mode: "insensitive" }
              : null,
            shade: stockItem.shade
              ? { equals: stockItem.shade, mode: "insensitive" }
              : null,
          },
        })

        if (existingBd) {
          await tx.bdInventory.update({
            where: { id: existingBd.id },
            data: {
              qty: { increment: stockItem.qtyToShip },
            },
          })
        } else {
          await tx.bdInventory.create({
            data: {
              productName: stockItem.productName,
              brand: stockItem.brand,
              shade: stockItem.shade,
              qty: stockItem.qtyToShip,
              buyPriceBdt: null,
              sellPriceBdt: null,
              tags: usaItem.tags,
            },
          })
        }

        const remainingQty = usaItem.qty - stockItem.qtyToShip
        if (remainingQty <= 0) {
          await tx.usaInventory.delete({
            where: { id: usaItem.id },
          })
        } else {
          await tx.usaInventory.update({
            where: { id: usaItem.id },
            data: { qty: remainingQty },
          })
        }

        stockItemsMoved += 1
      }

      await tx.shipment.update({
        where: { id: params.id },
        data: {
          status: "ARRIVED",
          arrivalDate: new Date(),
          stockItems: [] as Prisma.InputJsonValue,
        },
      })

      return {
        ordersUpdated: ordersUpdated.count,
        stockItemsMoved,
      }
    })

    return NextResponse.json({
      arrived: true,
      ordersUpdated: result.ordersUpdated,
      stockItemsMoved: result.stockItemsMoved,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark shipment arrived."
    if (message === "SHIPMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }
    if (message.startsWith("USA_ITEM_NOT_FOUND")) {
      return NextResponse.json(
        { error: "One or more selected USA inventory items were not found." },
        { status: 400 }
      )
    }
    if (message.startsWith("QTY_EXCEEDS_STOCK")) {
      const [, productName] = message.split(":")
      return NextResponse.json(
        { error: `Qty to move exceeds available stock for ${productName}.` },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
