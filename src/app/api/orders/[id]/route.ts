import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { OrderSchema } from "@/lib/validations"

type Params = {
  params: { id: string }
}

const OrderUpdateSchema = OrderSchema.partial()

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
    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check order."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const updated = await prisma.order.update({
      where: { id: params.id },
      data,
      include: {
        buyer: {
          select: { id: true, name: true, phone: true },
        },
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update order."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check order."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const deleted = await prisma.order.delete({
      where: { id: params.id },
    })
    return NextResponse.json(deleted)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete order."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
