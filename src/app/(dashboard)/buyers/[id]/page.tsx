import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import BuyerDrawer, { type BuyerData } from "@/components/shared/BuyerDrawer"
import BuyerOrderHistory from "@/components/shared/BuyerOrderHistory"
import { Button } from "@/components/ui/button"

type BuyerOrder = {
  id: string
  sellPriceBdt: number
  depositBdt: number
  productName: string
  brand: string | null
  status:
    | "TO_BE_PURCHASED"
    | "PURCHASED"
    | "IN_TRANSIT"
    | "IN_BANGLADESH"
    | "DELIVERED"
    | "RETURNED"
  createdAt: string
}

type BuyerProfileResponse = BuyerData & {
  orders: BuyerOrder[]
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

async function getBuyer(id: string) {
  const h = headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  const cookie = h.get("cookie")
  if (!host) {
    throw new Error("Missing request host header.")
  }

  const res = await fetch(`${proto}://${host}/api/buyers/${id}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch buyer profile.")
  return (await res.json()) as BuyerProfileResponse
}

export default async function BuyerProfilePage({ params }: { params: { id: string } }) {
  const buyer = await getBuyer(params.id)
  if (!buyer) notFound()

  const totalOrders = buyer.orders.length
  const totalSpend = buyer.orders.reduce((sum, order) => sum + order.sellPriceBdt, 0)
  const outstandingBalance = buyer.orders
    .filter((order) => !["DELIVERED", "RETURNED"].includes(order.status))
    .reduce((sum, order) => sum + (order.sellPriceBdt - order.depositBdt), 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#1E1215]">{buyer.name}</h1>
          <p className="text-sm text-[#8B6F74]">{buyer.phone || "No phone added"}</p>
          <p className="text-sm text-[#8B6F74]">{buyer.address || "No address added"}</p>
          <p className="text-sm text-[#8B6F74]">{buyer.notes || "No notes yet"}</p>
        </div>

        <div className="flex items-center gap-2">
          <BuyerDrawer
            mode="edit"
            buyer={buyer}
            trigger={
              <Button type="button" variant="outline">
                Edit
              </Button>
            }
          />
          <Button asChild>
            <Link
              href={`/orders?buyerId=${encodeURIComponent(buyer.id)}&buyerName=${encodeURIComponent(
                buyer.name
              )}`}
            >
              + Add Order
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8B6F74]">Total Orders</p>
          <p className="mt-1 text-2xl font-semibold">{totalOrders}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8B6F74]">Total Spend (BDT)</p>
          <p className="mt-1 text-2xl font-semibold">{formatBdt(totalSpend)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8B6F74]">Outstanding Balance (BDT)</p>
          <p className={`mt-1 text-2xl font-semibold ${outstandingBalance > 0 ? "text-red-600" : ""}`}>
            {formatBdt(outstandingBalance)}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#1E1215]">Order History</h2>
        <BuyerOrderHistory orders={buyer.orders} />
      </section>
    </div>
  )
}
