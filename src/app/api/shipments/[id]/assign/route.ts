import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"

const AssignSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let parsed: z.infer<typeof AssignSchema>
  try {
    const body = await req.json()
    parsed = AssignSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }

    const result = await prisma.order.updateMany({
      where: {
        id: { in: parsed.orderIds },
        status: "PURCHASED",
      },
      data: {
        batchId: params.id,
      },
    })

    return NextResponse.json({ assigned: result.count })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign orders."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
