import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { BuyerSchema } from "@/lib/validations"

type Params = {
  params: { id: string }
}

const BuyerUpdateSchema = BuyerSchema.partial()

export async function GET(_req: Request, { params }: Params) {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          select: {
            sellPriceBdt: true,
            depositBdt: true,
            productName: true,
            brand: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found." }, { status: 404 })
    }

    return NextResponse.json(buyer)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch buyer."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  let parsedBody: z.infer<typeof BuyerUpdateSchema>

  try {
    const body = await req.json()
    parsedBody = BuyerUpdateSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const data = Object.fromEntries(
    Object.entries(parsedBody).filter(([, value]) => value !== undefined)
  )

  try {
    const existingBuyer = await prisma.buyer.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!existingBuyer) {
      return NextResponse.json({ error: "Buyer not found." }, { status: 404 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check buyer."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const updatedBuyer = await prisma.buyer.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(updatedBuyer)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update buyer."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found." }, { status: 404 })
    }

    if (buyer._count.orders > 0) {
      return NextResponse.json(
        { error: "Cannot delete buyer with existing orders." },
        { status: 400 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check buyer orders."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const deletedBuyer = await prisma.buyer.delete({
      where: { id: params.id },
    })

    return NextResponse.json(deletedBuyer)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete buyer."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
