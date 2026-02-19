"use client"

import Fuse from "fuse.js"
import { CalendarIcon } from "lucide-react"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { DateRange } from "react-day-picker"

import OrderDrawer, { type OrderData } from "@/components/shared/OrderDrawer"
import OrdersTable from "@/components/shared/OrdersTable"
import { Badge } from "@/components/ui/badge"
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

type BuyerOption = {
  id: string
  name: string
  phone: string | null
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
  const [buyerSearch, setBuyerSearch] = useState("")
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null)
  const [buyerOptions, setBuyerOptions] = useState<BuyerOption[]>([])
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(false)

  const defaultBuyerId = searchParams.get("buyerId") ?? undefined
  const defaultBuyerName = searchParams.get("buyerName") ?? undefined
  const autoOpen = searchParams.get("new") === "true" || !!defaultBuyerId

  const buyerFuse = useMemo(
    () =>
      new Fuse(buyerOptions, {
        keys: ["name", "phone"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [buyerOptions]
  )

  const filteredBuyerOptions = useMemo(() => {
    const term = buyerSearch.trim()
    if (!term) return buyerOptions.slice(0, 8)
    return buyerFuse.search(term, { limit: 8 }).map((result) => result.item)
  }, [buyerFuse, buyerOptions, buyerSearch])

  const selectedBuyerName = useMemo(() => {
    if (!selectedBuyerId) return ""
    return buyerOptions.find((buyer) => buyer.id === selectedBuyerId)?.name ?? buyerSearch
  }, [buyerOptions, selectedBuyerId, buyerSearch])

  const selectedBuyerPhone = useMemo(() => {
    if (!selectedBuyerId) return null
    return buyerOptions.find((buyer) => buyer.id === selectedBuyerId)?.phone ?? null
  }, [buyerOptions, selectedBuyerId])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", "1")
      if (status !== "ALL") params.set("status", status)
      if (source !== "ALL") params.set("source", source)
      if (selectedBuyerId) params.set("buyerId", selectedBuyerId)
      if (search.trim()) params.set("search", search.trim())

      const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) return

      const data = (await res.json()) as OrdersResponse
      setOrders(data.orders)
    } finally {
      setLoading(false)
    }
  }, [search, selectedBuyerId, source, status])

  useEffect(() => {
    if (autoOpen) setOpenAdd(true)
  }, [autoOpen])

  useEffect(() => {
    if (!defaultBuyerId) return
    setSelectedBuyerId(defaultBuyerId)
    setBuyerSearch(defaultBuyerName ?? "")
  }, [defaultBuyerId, defaultBuyerName])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const res = await fetch("/api/buyers", { cache: "no-store" })
      if (!res.ok || cancelled) return
      const data = (await res.json()) as BuyerOption[]
      if (cancelled) return
      setBuyerOptions(data)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders, dateRange])

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

  const hasActiveFilters =
    !!selectedBuyerId ||
    status !== "ALL" ||
    source !== "ALL" ||
    search.trim().length > 0 ||
    !!dateRange?.from ||
    !!dateRange?.to

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Orders</h1>
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

      <div className="grid gap-3 md:grid-cols-5">
        <div className="relative">
          <Input
            placeholder="Filter by buyer..."
            value={buyerSearch}
            onFocus={() => setBuyerDropdownOpen(true)}
            onBlur={() => setTimeout(() => setBuyerDropdownOpen(false), 120)}
            onChange={(e) => {
              const nextValue = e.target.value
              setBuyerSearch(nextValue)
              setBuyerDropdownOpen(true)
              if (!nextValue.trim()) {
                setSelectedBuyerId(null)
                return
              }
              if (selectedBuyerId && nextValue !== selectedBuyerName) {
                setSelectedBuyerId(null)
              }
            }}
            className={buyerSearch ? "pr-8" : ""}
          />
          {buyerSearch ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B6F74]/70 hover:text-[#8B6F74]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setBuyerSearch("")
                setSelectedBuyerId(null)
                setBuyerDropdownOpen(false)
              }}
              aria-label="Clear buyer filter"
            >
              x
            </button>
          ) : null}

          {buyerDropdownOpen && !selectedBuyerId && filteredBuyerOptions.length > 0 ? (
            <div className="absolute z-30 mt-1 w-full rounded-md border bg-[#FAFAFA] shadow">
              {filteredBuyerOptions.map((buyer) => (
                <button
                  key={buyer.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FAFAFA]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedBuyerId(buyer.id)
                    setBuyerSearch(buyer.name)
                    setBuyerDropdownOpen(false)
                  }}
                >
                  <span>{buyer.name}</span>
                  {buyer.phone ? (
                    <span className="ml-2 text-xs text-[#8B6F74]">· {buyer.phone}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

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

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedBuyerId ? (
            <Badge variant="outline" className="gap-1">
              Buyer: {selectedBuyerName}
              {selectedBuyerPhone ? (
                <span className="text-xs text-[#8B6F74]">· {selectedBuyerPhone}</span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSelectedBuyerId(null)
                  setBuyerSearch("")
                }}
                aria-label="Clear buyer filter"
              >
                x
              </button>
            </Badge>
          ) : null}
          {status !== "ALL" ? (
            <Badge variant="outline" className="gap-1">
              Status: {status}
              <button type="button" onClick={() => setStatus("ALL")} aria-label="Clear status filter">
                x
              </button>
            </Badge>
          ) : null}
          {source !== "ALL" ? (
            <Badge variant="outline" className="gap-1">
              Source: {source}
              <button type="button" onClick={() => setSource("ALL")} aria-label="Clear source filter">
                x
              </button>
            </Badge>
          ) : null}
          {search.trim() ? (
            <Badge variant="outline" className="gap-1">
              Search: {search.trim()}
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search filter">
                x
              </button>
            </Badge>
          ) : null}
          {dateRange?.from || dateRange?.to ? (
            <Badge variant="outline" className="gap-1">
              Date: {formatRangeLabel(dateRange)}
              <button type="button" onClick={() => setDateRange(undefined)} aria-label="Clear date filter">
                x
              </button>
            </Badge>
          ) : null}
          <button
            type="button"
            className="text-sm text-[#8B6F74] underline hover:text-[#5D4548]"
            onClick={() => {
              setSelectedBuyerId(null)
              setBuyerSearch("")
              setStatus("ALL")
              setSource("ALL")
              setSearch("")
              setDateRange(undefined)
            }}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#8B6F74]">Loading orders...</p>
      ) : (
        <OrdersTable orders={visibleOrders} refetchOrders={fetchOrders} />
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#8B6F74]">Loading orders...</p>}>
      <OrdersPageContent />
    </Suspense>
  )
}
