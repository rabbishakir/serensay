import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { getSession } from "@/lib/session"

function toMonthLabel(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

function parseMonthParam(monthParam: string | null) {
  if (!monthParam) {
    const now = new Date()
    const year = now.getFullYear()
    const monthIndex = now.getMonth()
    return {
      month: toMonthLabel(year, monthIndex),
      start: new Date(year, monthIndex, 1),
      end: new Date(year, monthIndex + 1, 1),
    }
  }

  const match = /^(\d{4})-(\d{2})$/.exec(monthParam)
  if (!match) return null

  const year = Number(match[1])
  const monthNum = Number(match[2])
  if (monthNum < 1 || monthNum > 12) return null

  const monthIndex = monthNum - 1
  return {
    month: toMonthLabel(year, monthIndex),
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const parsedMonth = parseMonthParam(req.nextUrl.searchParams.get("month"))
  if (!parsedMonth) {
    return NextResponse.json(
      { error: "Invalid month format. Use YYYY-MM." },
      { status: 400 }
    )
  }

  try {
    const [orders, exchangeRateSetting] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: parsedMonth.start,
            lt: parsedMonth.end,
          },
        },
        select: {
          id: true,
          productName: true,
          brand: true,
          sellPriceBdt: true,
          buyPriceUsd: true,
          depositBdt: true,
          status: true,
          buyer: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.setting.findUnique({
        where: { key: "exchange_rate" },
        select: { value: true },
      }),
    ])

    const exchangeRate = Number(exchangeRateSetting?.value ?? "0") || 0
    const totalOrders = orders.length

    const totalSalesBdt = orders.reduce((sum, o) => sum + o.sellPriceBdt, 0)
    const totalPurchasesUsd = orders.reduce((sum, o) => sum + (o.buyPriceUsd ?? 0), 0)
    const totalPurchasesBdt = totalPurchasesUsd * exchangeRate
    const totalDepositsCollected = orders.reduce((sum, o) => sum + o.depositBdt, 0)

    const outstandingBalance = orders
      .filter((o) => o.status !== "DELIVERED" && o.status !== "RETURNED")
      .reduce((sum, o) => sum + (o.sellPriceBdt - o.depositBdt), 0)

    const grossProfitBdt = totalSalesBdt - totalPurchasesBdt
    const marginPct = totalSalesBdt > 0 ? (grossProfitBdt / totalSalesBdt) * 100 : 0

    const ordersByStatus: Record<
      "TO_BE_PURCHASED" | "PURCHASED" | "IN_TRANSIT" | "IN_BANGLADESH" | "DELIVERED" | "RETURNED",
      number
    > = {
      TO_BE_PURCHASED: 0,
      PURCHASED: 0,
      IN_TRANSIT: 0,
      IN_BANGLADESH: 0,
      DELIVERED: 0,
      RETURNED: 0,
    }
    for (const order of orders) {
      ordersByStatus[order.status] += 1
    }

    const productCount = new Map<string, number>()
    for (const order of orders) {
      productCount.set(order.productName, (productCount.get(order.productName) ?? 0) + 1)
    }
    const topProducts = Array.from(productCount.entries())
      .map(([productName, count]) => ({ productName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const ordersTable = orders.map((o) => ({
      id: o.id,
      buyerName: o.buyer.name,
      product: o.productName,
      brand: o.brand,
      sell: o.sellPriceBdt,
      buy: o.buyPriceUsd,
      deposit: o.depositBdt,
      status: o.status,
    }))

    return NextResponse.json({
      month: parsedMonth.month,
      totalOrders,
      totalSalesBdt,
      totalPurchasesUsd,
      totalPurchasesBdt,
      totalDepositsCollected,
      outstandingBalance,
      grossProfitBdt,
      marginPct,
      ordersByStatus,
      topProducts,
      ordersTable,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate monthly report."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
