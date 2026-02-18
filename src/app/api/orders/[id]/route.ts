import { OrderStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { restoreToInventory } from "@/lib/inventoryUtils"
import { OrderSchema } from "@/lib/validations"

type Params = {
  params: { id: string }
}

const OrderUpdateSchema = OrderSchema.partial()
class NotFoundError extends Error {}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch order."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let parsedBody: z.infer<typeof OrderUpdateSchema>

  try {
    const body = await req.json()
    parsedBody = OrderUpdateSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const data = Object.fromEntries(
    Object.entries(parsedBody).filter(([, value]) => value !== undefined)
  )

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          status: true,
          productName: true,
          brand: true,
          shade: true,
          qty: true,
          source: true,
        },
      })
      if (!existing) {
        throw new NotFoundError("Order not found.")
      }

      const next = await tx.order.update({
        where: { id: params.id },
        data,
        include: {
          buyer: {
            select: { id: true, name: true, phone: true },
          },
        },
      })

      if (
        parsedBody.status === OrderStatus.RETURNED &&
        existing.status !== OrderStatus.RETURNED
      ) {
        await restoreToInventory(tx, {
          productName: existing.productName,
          brand: existing.brand,
          shade: existing.shade,
          qty: existing.qty,
          source: existing.source,
        })
      }

      return next
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    const message = error instanceof Error ? error.message : "Failed to update order."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          status: true,
          productName: true,
          brand: true,
          shade: true,
          qty: true,
          source: true,
        },
      })
      if (!existing) {
        throw new NotFoundError("Order not found.")
      }

      if (
        existing.status !== OrderStatus.DELIVERED &&
        existing.status !== OrderStatus.RETURNED
      ) {
        await restoreToInventory(tx, {
          productName: existing.productName,
          brand: existing.brand,
          shade: existing.shade,
          qty: existing.qty,
          source: existing.source,
        })
      }

      await tx.order.delete({
        where: { id: params.id },
      })
    })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    const message = error instanceof Error ? error.message : "Failed to delete order."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
