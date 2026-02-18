import { type Prisma, OrderStatus, Source } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { deductFromInventory } from "@/lib/inventoryUtils"
import { OrderSchema } from "@/lib/validations"

const PAGE_SIZE = 50

function parseEnumValue<T extends string>(value: string | null, values: readonly T[]) {
  if (!value) return null
  return values.includes(value as T) ? (value as T) : undefined
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const pageRaw = params.get("page") ?? "1"
  const page = Number(pageRaw)

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 })
  }

  const status = parseEnumValue(params.get("status"), Object.values(OrderStatus))
  if (status === undefined) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 })
  }

  const source = parseEnumValue(params.get("source"), Object.values(Source))
  if (source === undefined) {
    return NextResponse.json({ error: "Invalid source filter." }, { status: 400 })
  }

  const buyerId = params.get("buyerId")
  const search = params.get("search")?.trim()

  const where: Prisma.OrderWhereInput = {}
  if (status) where.status = status
  if (source) where.source = source
  if (buyerId) where.buyerId = buyerId
  if (search) {
    where.OR = [
      { productName: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ]
  }

  try {
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.order.count({ where }),
    ])

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

    return NextResponse.json({ orders, totalCount, totalPages })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof OrderSchema>

  try {
    const body = await req.json()
    parsed = OrderSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const autoStatusBySource: Record<Source, OrderStatus> = {
    BD_STOCK: OrderStatus.IN_BANGLADESH,
    USA_STOCK: OrderStatus.PURCHASED,
    PRE_ORDER: OrderStatus.TO_BE_PURCHASED,
  }

  const status = parsed.status ?? autoStatusBySource[parsed.source]

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          ...parsed,
          status,
        },
        include: {
          buyer: {
            select: { name: true },
          },
        },
      })

      const deduction = await deductFromInventory(tx, {
        productName: order.productName,
        brand: order.brand,
        shade: order.shade,
        qty: order.qty,
        source: order.source,
      })

      return {
        order,
        warning: deduction.warning,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
