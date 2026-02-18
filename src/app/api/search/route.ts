import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim()
  const hasQuery = q.length > 0

  const buyers = await prisma.buyer.findMany({
    where: hasQuery
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { name: "asc" },
    ...(hasQuery ? { take: 5 } : {}),
  })

  const ordersRaw = await prisma.order.findMany({
    where: hasQuery
      ? {
          OR: [
            { productName: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      productName: true,
      brand: true,
      status: true,
      buyer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    ...(hasQuery ? { take: 5 } : {}),
  })

  const orders = ordersRaw.map((order) => ({
    id: order.id,
    productName: order.productName,
    brand: order.brand,
    buyerName: order.buyer.name,
    status: order.status,
  }))

  return NextResponse.json({ buyers, orders })
}
