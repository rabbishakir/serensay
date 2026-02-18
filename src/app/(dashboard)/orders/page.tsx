"use client"

import { CalendarIcon } from "lucide-react"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { DateRange } from "react-day-picker"

import OrderDrawer, { type OrderData } from "@/components/shared/OrderDrawer"
import OrdersTable from "@/components/shared/OrdersTable"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SourceValue = "ALL" | "BD_STOCK" | "USA_STOCK" | "PRE_ORDER"
type StatusValue =
  | "ALL"
  | "TO_BE_PURCHASED"
  | "PURCHASED"
  | "IN_TRANSIT"
  | "IN_BANGLADESH"
  | "DELIVERED"
  | "RETURNED"

type OrdersResponse = {
  orders: OrderData[]
  totalCount: number
  totalPages: number
}

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from && !range?.to) return "Date range"
  if (range?.from && !range?.to) return range.from.toLocaleDateString("en-BD")
  return `${range?.from?.toLocaleDateString("en-BD")} - ${range?.to?.toLocaleDateString("en-BD")}`
}

function OrdersPageContent() {
  const searchParams = useSearchParams()

  const [openAdd, setOpenAdd] = useState(false)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [status, setStatus] = useState<StatusValue>("ALL")
  const [source, setSource] = useState<SourceValue>("ALL")
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(false)

  const defaultBuyerId = searchParams.get("buyerId") ?? undefined
  const defaultBuyerName = searchParams.get("buyerName") ?? undefined
  const autoOpen = searchParams.get("new") === "true" || !!defaultBuyerId

  useEffect(() => {
    if (autoOpen) setOpenAdd(true)
  }, [autoOpen])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("page", "1")
        if (status !== "ALL") params.set("status", status)
        if (source !== "ALL") params.set("source", source)
        if (defaultBuyerId) params.set("buyerId", defaultBuyerId)
        if (search.trim()) params.set("search", search.trim())

        const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" })
        if (!res.ok || cancelled) return

        const data = (await res.json()) as OrdersResponse
        if (cancelled) return
        setOrders(data.orders)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [status, source, search, dateRange, defaultBuyerId])

  const visibleOrders = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return orders
    const from = dateRange.from
      ? new Date(
          new Date(dateRange.from).setHours(0, 0, 0, 0)
        )
      : null
    const to = dateRange.to
      ? new Date(
          new Date(dateRange.to).setHours(23, 59, 59, 999)
        )
      : null
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt)
      if (from && orderDate < from) return false
      if (to && orderDate > to) return false
      return true
    })
  }, [orders, dateRange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <OrderDrawer
          mode="add"
          defaultBuyerId={defaultBuyerId}
          defaultBuyerName={defaultBuyerName}
          open={openAdd}
          onOpenChange={setOpenAdd}
          onSaved={(saved) => setOrders((prev) => [saved, ...prev])}
          trigger={<Button>+ New Order</Button>}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Select value={status} onValueChange={(v) => setStatus(v as StatusValue)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="TO_BE_PURCHASED">To Be Purchased</SelectItem>
            <SelectItem value="PURCHASED">Purchased</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="IN_BANGLADESH">In Bangladesh</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={(v) => setSource(v as SourceValue)}>
          <SelectTrigger>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="BD_STOCK">BD Stock</SelectItem>
            <SelectItem value="USA_STOCK">USA Stock</SelectItem>
            <SelectItem value="PRE_ORDER">Pre-Order</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search product or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start gap-2 font-normal">
              <CalendarIcon className="h-4 w-4" />
              {formatRangeLabel(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading orders...</p>
      ) : (
        <OrdersTable orders={visibleOrders} />
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading orders...</p>}>
      <OrdersPageContent />
    </Suspense>
  )
}
