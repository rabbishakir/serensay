import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"
import { BuyerSchema } from "@/lib/validations"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  try {
    const q = (req.nextUrl.searchParams.get("search") ?? "").trim()
    const hasQuery = q.length > 0
    const isPhoneSearch = /^[\d\s+()-]+$/.test(q.trim())
    const normalizedPhoneQuery = q.replace(/\s+/g, "")

    const where = hasQuery
      ? isPhoneSearch
        ? {
            phone: {
              contains: normalizedPhoneQuery,
            },
          }
        : {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
            ],
          }
      : undefined

    const [buyers, outstandingByBuyer] = await Promise.all([
      prisma.buyer.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.order.groupBy({
        by: ["buyerId"],
        where: {
          status: {
            notIn: ["DELIVERED", "RETURNED"],
          },
        },
        _sum: {
          sellPriceBdt: true,
          depositBdt: true,
        },
      }),
    ])

    const outstandingMap = new Map(
      outstandingByBuyer.map((entry) => [
        entry.buyerId,
        (entry._sum.sellPriceBdt ?? 0) - (entry._sum.depositBdt ?? 0),
      ])
    )

    const result = buyers.map((buyer) => ({
      ...buyer,
      outstandingBalance: outstandingMap.get(buyer.id) ?? 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch buyers."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  let parsedBody: z.infer<typeof BuyerSchema>

  try {
    const body = await req.json()
    parsedBody = BuyerSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const createdBuyer = await prisma.buyer.create({
      data: parsedBody,
    })

    return NextResponse.json(createdBuyer, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create buyer."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
