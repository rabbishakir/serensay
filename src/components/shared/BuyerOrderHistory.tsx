"use client"

import Link from "next/link"

import StatusBadge from "@/components/shared/StatusBadge"
import { cn } from "@/lib/utils"

type BuyerOrderHistoryItem = {
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

type BuyerOrderHistoryProps = {
  orders: BuyerOrderHistoryItem[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function BuyerOrderHistory({ orders }: BuyerOrderHistoryProps) {
  if (orders.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-[#8B6F74]">
        No orders yet. Click + Add Order to create the first one.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const balanceDue = order.sellPriceBdt - order.depositBdt
        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="group block rounded-lg border p-4 transition-colors hover:bg-[#FAFAFA]"
          >
            <div className="grid gap-3 md:grid-cols-[140px_1fr_auto_auto] md:items-center">
              <div className="text-sm text-[#8B6F74]">{formatDate(order.createdAt)}</div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#1E1215] group-hover:underline">
                  {order.productName}
                </p>
                {order.brand ? <p className="text-sm text-[#8B6F74]">{order.brand}</p> : null}
              </div>
              <div>
                <StatusBadge status={order.status} />
              </div>
              <div
                className={cn(
                  "text-sm font-semibold",
                  balanceDue > 0 ? "text-amber-600" : "text-[#8B6F74]"
                )}
              >
                {formatBdt(balanceDue)}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
