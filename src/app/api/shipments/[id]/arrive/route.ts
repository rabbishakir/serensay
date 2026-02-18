import { NextResponse } from "next/server"

import { prisma } from "@/lib/db"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.order.updateMany({
        where: { batchId: params.id },
        data: { status: "IN_BANGLADESH" },
      }),
      prisma.shipment.update({
        where: { id: params.id },
        data: {
          status: "ARRIVED",
          arrivalDate: new Date(),
        },
      }),
    ])

    const updated = await prisma.shipment.findUnique({
      where: { id: params.id },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark shipment arrived."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
