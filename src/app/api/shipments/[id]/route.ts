import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const ShipmentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  departureDate: z.string().datetime().nullable().optional(),
  arrivalDate: z.string().datetime().nullable().optional(),
  status: z.enum(["PACKING", "IN_TRANSIT", "ARRIVED"]).optional(),
  notes: z.string().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          select: {
            id: true,
            productName: true,
            status: true,
            sellPriceBdt: true,
            buyer: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }

    return NextResponse.json(shipment)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch shipment."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let parsed: z.infer<typeof ShipmentUpdateSchema>
  try {
    const body = await req.json()
    parsed = ShipmentUpdateSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const data = {
    ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
    departureDate:
      parsed.departureDate === undefined
        ? undefined
        : parsed.departureDate === null
          ? null
          : new Date(parsed.departureDate),
    arrivalDate:
      parsed.arrivalDate === undefined
        ? undefined
        : parsed.arrivalDate === null
          ? null
          : new Date(parsed.arrivalDate),
  }

  try {
    const updated = await prisma.shipment.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update shipment."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }

    if (shipment._count.orders > 0) {
      return NextResponse.json(
        { error: "Cannot delete shipment with assigned orders." },
        { status: 400 }
      )
    }

    const deleted = await prisma.shipment.delete({
      where: { id: params.id },
    })
    return NextResponse.json(deleted)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete shipment."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
