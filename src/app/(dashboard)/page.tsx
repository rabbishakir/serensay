import { headers } from "next/headers"

import StatusBadge from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/db"

type DashboardStats = {
  totalThisMonth: number
  pendingPurchase: number
  inBangladesh: number
  outstandingBalance: number
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

async function getDashboardStats() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  if (!host) {
    throw new Error("Missing request host header for dashboard API fetch.")
  }

  const res = await fetch(`${proto}://${host}/api/dashboard`, {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard stats.")
  }

  return (await res.json()) as DashboardStats
}

async function getActionNeededOrders() {
  return prisma.order.findMany({
    where: {
      status: {
        in: ["TO_BE_PURCHASED", "IN_BANGLADESH"],
      },
    },
    include: {
      buyer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  })
}

export default async function DashboardPage() {
  const [stats, actionNeeded] = await Promise.all([getDashboardStats(), getActionNeededOrders()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">Operational snapshot for Glam Orbit Lite.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.totalThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.pendingPurchase}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">In Bangladesh</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.inBangladesh}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Outstanding Balance Total (BDT)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatBdt(stats.outstandingBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Needed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">Buyer</th>
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {actionNeeded.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                      No action-needed orders.
                    </td>
                  </tr>
                ) : (
                  actionNeeded.map((order) => {
                    const balanceDue = order.sellPriceBdt - order.depositBdt
                    return (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="px-2 py-3">{order.buyer.name}</td>
                        <td className="px-2 py-3">{order.productName}</td>
                        <td className="px-2 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-2 py-3 font-medium">{formatBdt(balanceDue)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
