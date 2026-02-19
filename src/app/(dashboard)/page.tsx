import { headers } from "next/headers"

import DashboardActionNeededTable from "@/components/shared/DashboardActionNeededTable"
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
  const cookie = h.get("cookie")
  if (!host) {
    throw new Error("Missing request host header for dashboard API fetch.")
  }

  const res = await fetch(`${proto}://${host}/api/dashboard`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
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
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Dashboard</h1>
        <p className="text-sm text-[#8B6F74]">Operational snapshot for Glam Orbit Lite.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border border-[#EDE0E2] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#8B6F74]">Total Orders This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#1E1215]">{stats.totalThisMonth}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[#EDE0E2] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#8B6F74]">Pending Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#1E1215]">{stats.pendingPurchase}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[#EDE0E2] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#8B6F74]">In Bangladesh</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#1E1215]">{stats.inBangladesh}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[#EDE0E2] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#8B6F74]">Outstanding Balance Total (BDT)</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                stats.outstandingBalance > 0 ? "text-[#BA4E5A]" : "text-[#1E1215]"
              }`}
            >
              {formatBdt(stats.outstandingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-[#EDE0E2] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-semibold text-[#1E1215]">Action Needed</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardActionNeededTable orders={actionNeeded} />
        </CardContent>
      </Card>
    </div>
  )
}
