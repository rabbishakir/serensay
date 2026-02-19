import { OrderStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

type Params = {
  params: { id: string }
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const PurchaseSchema = z.object({
  buyPriceUsd: z.number().positive("Buy price must be a positive number."),
  weightG: z.number().positive("Weight must be a positive number."),
  extraQty: z.number().int().min(0, "Extra qty must be 0 or a positive integer."),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  let parsedBody: z.infer<typeof PurchaseSchema>

  try {
    const body = await req.json()
    parsedBody = PurchaseSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.id },
      })

      if (!order) {
        throw new ApiError("Order not found", 404)
      }

      if (order.status !== OrderStatus.TO_BE_PURCHASED) {
        throw new ApiError("Order is not in To Be Purchased status", 400)
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PURCHASED,
          buyPriceUsd: parsedBody.buyPriceUsd,
        },
        include: {
          buyer: {
            select: { name: true },
          },
        },
      })

      let inventoryItem = null
      if (parsedBody.extraQty > 0) {
        const existingItem = await tx.usaInventory.findFirst({
          where: {
            productName: { equals: order.productName, mode: "insensitive" },
            brand:
              order.brand == null ? null : { equals: order.brand, mode: "insensitive" },
            shade:
              order.shade == null ? null : { equals: order.shade, mode: "insensitive" },
          },
        })

        if (existingItem) {
          inventoryItem = await tx.usaInventory.update({
            where: { id: existingItem.id },
            data: {
              qty: existingItem.qty + parsedBody.extraQty,
              buyPriceUsd: parsedBody.buyPriceUsd,
              weightG: parsedBody.weightG,
            },
          })
        } else {
          inventoryItem = await tx.usaInventory.create({
            data: {
              productName: order.productName,
              brand: order.brand,
              shade: order.shade,
              qty: parsedBody.extraQty,
              buyPriceUsd: parsedBody.buyPriceUsd,
              weightG: parsedBody.weightG,
              tags: ["Stocked"],
            },
          })
        }
      }

      const message =
        parsedBody.extraQty > 0
          ? `Order marked as purchased. ${parsedBody.extraQty} extra units added to USA inventory.`
          : "Order marked as purchased."

      return {
        order: updatedOrder,
        inventoryItem,
        message,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : "Failed to mark order as purchased."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
