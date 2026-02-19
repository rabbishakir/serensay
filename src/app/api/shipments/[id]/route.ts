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
            brand: true,
            shade: true,
            qty: true,
            buyPriceUsd: true,
            depositBdt: true,
            status: true,
            sellPriceBdt: true,
            source: true,
            createdAt: true,
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    })

    if (!shipment) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      if (shipment.status === "IN_TRANSIT") {
        await tx.order.updateMany({
          where: { batchId: id },
          data: { batchId: null, status: "PURCHASED" },
        })
      } else {
        await tx.order.updateMany({
          where: { batchId: id },
          data: { batchId: null },
        })
      }

      await tx.shipment.delete({
        where: { id },
      })
    })

    return Response.json({ deleted: true })
  } catch (error) {
    console.error("Delete shipment error:", error)
    return Response.json({ error: "Failed to delete shipment" }, { status: 500 })
  }
}
