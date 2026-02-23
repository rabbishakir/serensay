"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import BuyerDrawer, { type BuyerData } from "@/components/shared/BuyerDrawer"
import BuyerOrderHistory from "@/components/shared/BuyerOrderHistory"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type BuyerOrder = {
  id: string
  buyerId: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  sellPriceBdt: number
  buyPriceUsd: number | null
  depositBdt: number
  source: "BD_STOCK" | "USA_STOCK" | "PRE_ORDER"
  status:
    | "TO_BE_PURCHASED"
    | "PURCHASED"
    | "IN_TRANSIT"
    | "IN_BANGLADESH"
    | "DELIVERED"
    | "RETURNED"
  batchId: string | null
  tags: string[]
  notes: string | null
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

export default function BuyerProfilePage() {
  const params = useParams<{ id: string }>()
  const buyerId = params?.id

  const [buyer, setBuyer] = useState<BuyerProfileResponse | null>(null)
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchBuyer = useCallback(async () => {
    if (!buyerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/buyers/${buyerId}`, { cache: "no-store" })
      if (res.status === 404) {
        setNotFound(true)
        setBuyer(null)
        setOrders([])
        return
      }
      if (!res.ok) return
      const data = (await res.json()) as BuyerProfileResponse
      setNotFound(false)
      setBuyer(data)
      setOrders(data.orders ?? [])
    } finally {
      setLoading(false)
    }
  }, [buyerId])

  const refreshOrders = useCallback(async () => {
    if (!buyerId) return
    try {
      const res = await fetch(`/api/buyers/${buyerId}`, { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as BuyerProfileResponse
      setBuyer(data)
      setOrders(data.orders ?? [])
    } catch {
      // keep current UI state on refresh error
    }
  }, [buyerId])

  useEffect(() => {
    void fetchBuyer()
  }, [fetchBuyer])

  const totalOrders = orders.length
  const totalSpend = useMemo(
    () => orders.reduce((sum, order) => sum + order.sellPriceBdt, 0),
    [orders]
  )
  const outstandingBalance = useMemo(
    () =>
      orders
        .filter((order) => order.status !== "DELIVERED" && order.status !== "RETURNED")
        .reduce((sum, order) => sum + (order.sellPriceBdt - order.depositBdt), 0),
    [orders]
  )

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Buyer not found</h1>
        <Button asChild variant="outline">
          <Link href="/buyers">Back to Buyers</Link>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-80" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        <section className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-[88px] w-full rounded-lg" />
            <Skeleton className="h-[88px] w-full rounded-lg" />
            <Skeleton className="h-[88px] w-full rounded-lg" />
          </div>
        </section>
      </div>
    )
  }

  if (!buyer) {
    return null
  }

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
        <BuyerOrderHistory
          orders={orders}
          buyerId={buyer.id}
          buyerName={buyer.name}
          onOrdersChanged={refreshOrders}
        />
      </section>
    </div>
  )
}
