import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

const ShipmentCreateSchema = z.object({
  name: z.string().min(1, "Name is required."),
  departureDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  try {
    const shipments = await prisma.shipment.findMany({
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(shipments)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch shipments."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  let parsed: z.infer<typeof ShipmentCreateSchema>
  try {
    const body = await req.json()
    parsed = ShipmentCreateSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const shipment = await prisma.shipment.create({
      data: {
        name: parsed.name,
        departureDate: parsed.departureDate ? new Date(parsed.departureDate) : undefined,
        notes: parsed.notes,
      },
    })
    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create shipment."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
