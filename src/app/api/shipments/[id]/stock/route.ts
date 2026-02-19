import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

const ShipmentStockItemSchema = z.object({
  usaInventoryId: z.string().min(1, "USA inventory item id is required."),
  productName: z.string().min(1, "Product name is required."),
  brand: z.string().nullable(),
  shade: z.string().nullable(),
  qtyToShip: z.number().int().positive("Qty to ship must be greater than 0."),
  buyPriceUsd: z.number().nullable(),
  weightG: z.number().nullable(),
})

const ShipmentStockPayloadSchema = z.object({
  stockItems: z.array(ShipmentStockItemSchema),
})

type ShipmentStockItem = z.infer<typeof ShipmentStockItemSchema>

function parseStockItems(raw: unknown): ShipmentStockItem[] {
  if (!Array.isArray(raw)) return []
  const parsed = z.array(ShipmentStockItemSchema).safeParse(raw)
  if (!parsed.success) return []
  return parsed.data
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(_req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        stockItems: true,
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }

    const stockItems = parseStockItems(shipment.stockItems)
    if (stockItems.length === 0) {
      return NextResponse.json({ stockItems: [] })
    }

    const ids = Array.from(new Set(stockItems.map((item) => item.usaInventoryId)))
    const usaItems = await prisma.usaInventory.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        qty: true,
        tags: true,
      },
    })
    const usaById = new Map(usaItems.map((item) => [item.id, item]))

    const hydrated = stockItems.map((item) => ({
      ...item,
      currentQty: usaById.get(item.usaInventoryId)?.qty ?? 0,
      tags: usaById.get(item.usaInventoryId)?.tags ?? [],
    }))

    return NextResponse.json({ stockItems: hydrated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch shipment stock items."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  let parsed: z.infer<typeof ShipmentStockPayloadSchema>
  try {
    const body = await req.json()
    parsed = ShipmentStockPayloadSchema.parse(body)
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }

    if (shipment.status !== "PACKING") {
      return NextResponse.json(
        { error: "Stock items can only be updated while shipment is in PACKING status." },
        { status: 400 }
      )
    }

    const ids = Array.from(new Set(parsed.stockItems.map((item) => item.usaInventoryId)))
    const usaItems = await prisma.usaInventory.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        qty: true,
      },
    })
    const usaById = new Map(usaItems.map((item) => [item.id, item]))

    if (usaItems.length !== ids.length) {
      return NextResponse.json(
        { error: "One or more USA inventory items were not found." },
        { status: 400 }
      )
    }

    for (const item of parsed.stockItems) {
      const usaItem = usaById.get(item.usaInventoryId)
      if (!usaItem) {
        return NextResponse.json(
          { error: `USA inventory item not found: ${item.productName}` },
          { status: 400 }
        )
      }
      if (item.qtyToShip > usaItem.qty) {
        return NextResponse.json(
          { error: `Qty to ship cannot exceed available stock for ${item.productName}.` },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.shipment.update({
      where: { id: params.id },
      data: {
        stockItems: parsed.stockItems as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        status: true,
        stockItems: true,
      },
    })

    return NextResponse.json({
      ...updated,
      stockItems: parseStockItems(updated.stockItems),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save shipment stock items."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
