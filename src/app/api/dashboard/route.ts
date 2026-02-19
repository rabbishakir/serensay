import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [totalThisMonth, pendingPurchase, inBangladesh, outstandingAgg] = await Promise.all([
    prisma.order.count({
      where: {
        createdAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    prisma.order.count({ where: { status: "TO_BE_PURCHASED" } }),
    prisma.order.count({ where: { status: "IN_BANGLADESH" } }),
    prisma.order.aggregate({
      _sum: {
        sellPriceBdt: true,
        depositBdt: true,
      },
      where: {
        status: {
          notIn: ["DELIVERED", "RETURNED"],
        },
      },
    }),
  ])

  const totalSell = outstandingAgg._sum.sellPriceBdt ?? 0
  const totalDeposit = outstandingAgg._sum.depositBdt ?? 0
  const outstandingBalance = totalSell - totalDeposit

  return NextResponse.json({
    totalThisMonth,
    pendingPurchase,
    inBangladesh,
    outstandingBalance,
  })
}
