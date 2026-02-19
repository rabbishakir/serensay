"use client"

import Fuse from "fuse.js"
import { Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import OrderDrawer from "@/components/shared/OrderDrawer"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type SearchBuyer = {
  id: string
  name: string
  phone: string | null
}

type SearchOrder = {
  id: string
  productName: string
  brand: string | null
  buyerName: string | null
  status: string
}

type SearchResponse = {
  buyers: SearchBuyer[]
  orders: SearchOrder[]
  bdInventory: SearchBdInventory[]
  usaInventory: SearchUsaInventory[]
}

type SearchBdInventory = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  sellPriceBdt: number | null
}

type SearchUsaInventory = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  buyPriceUsd: number | null
}

const CACHE_TTL_MS = 60_000
const EMPTY_RESULTS: SearchResponse = {
  buyers: [],
  orders: [],
  bdInventory: [],
  usaInventory: [],
}

function mergeById<T extends { id: string }>(base: T[], incoming: T[]) {
  const map = new Map<string, T>()
  for (const item of base) map.set(item.id, item)
  for (const item of incoming) map.set(item.id, item)
  return Array.from(map.values())
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [cache, setCache] = useState<SearchResponse>({
    buyers: [],
    orders: [],
    bdInventory: [],
    usaInventory: [],
  })
  const [results, setResults] = useState<SearchResponse>({
    buyers: [],
    orders: [],
    bdInventory: [],
    usaInventory: [],
  })
  const [cacheAt, setCacheAt] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const searchRequestRef = useRef(0)
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false)
  const [blankOrderDrawerOpen, setBlankOrderDrawerOpen] = useState(false)
  const [prefilledProduct, setPrefilledProduct] = useState<{
    productName: string
    brand: string | null
    shade: string | null
    source: "BD_STOCK" | "USA_STOCK"
    sellPriceBdt?: number | null
    buyPriceUsd?: number | null
  } | null>(null)

  const isCacheStale = !cacheAt || Date.now() - cacheAt > CACHE_TTL_MS

  const formatBdt = (value: number | null | undefined) =>
    value == null
      ? "-"
      : new Intl.NumberFormat("en-BD", {
          style: "currency",
          currency: "BDT",
          maximumFractionDigits: 0,
        }).format(value)

  const formatUsd = (value: number | null | undefined) =>
    value == null ? "-" : `$${value.toFixed(2)}`

  const fetchSearchData = useCallback(async (term = "", merge = false) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: "no-store" })
    if (!res.ok) return
    const data = (await res.json()) as SearchResponse
    setCache((prev) =>
      merge
        ? {
            buyers: mergeById(prev.buyers, data.buyers),
            orders: mergeById(prev.orders, data.orders),
            bdInventory: mergeById(prev.bdInventory, data.bdInventory),
            usaInventory: mergeById(prev.usaInventory, data.usaInventory),
          }
        : data
    )
    setCacheAt(Date.now())
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    void fetchSearchData()
  }, [fetchSearchData])

  useEffect(() => {
    if (!open) return
    const isCacheEmpty =
      cache.buyers.length === 0 &&
      cache.orders.length === 0 &&
      cache.bdInventory.length === 0 &&
      cache.usaInventory.length === 0

    if ((isCacheEmpty || isCacheStale) && query.trim().length < 2) {
      void fetchSearchData()
    }
  }, [open, query, cache.buyers.length, cache.orders.length, cache.bdInventory.length, cache.usaInventory.length, isCacheStale, fetchSearchData])

  const buyers = cache.buyers
  const orders = cache.orders
  const bdInventory = cache.bdInventory
  const usaInventory = cache.usaInventory

  const buyerFuse = useMemo(
    () =>
      new Fuse(buyers, {
        keys: ["name", "phone"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [buyers]
  )

  const orderFuse = useMemo(
    () =>
      new Fuse(orders, {
        keys: ["productName", "brand", "buyerName", "status"],
        threshold: 0.3,
      }),
    [orders]
  )

  const bdInventoryFuse = useMemo(
    () =>
      new Fuse(bdInventory, {
        keys: ["productName", "brand", "shade"],
        threshold: 0.3,
      }),
    [bdInventory]
  )

  const usaInventoryFuse = useMemo(
    () =>
      new Fuse(usaInventory, {
        keys: ["productName", "brand", "shade"],
        threshold: 0.3,
      }),
    [usaInventory]
  )

  useEffect(() => {
    if (!open) return

    const term = query.trim()
    if (term.length < 2) {
      setResults(EMPTY_RESULTS)
      setIsLoading(false)
      return
    }

    const localResults = {
      buyers: buyerFuse.search(term, { limit: 10 }).map((r) => r.item),
      orders: orderFuse.search(term, { limit: 10 }).map((r) => r.item),
      bdInventory: bdInventoryFuse.search(term, { limit: 10 }).map((r) => r.item),
      usaInventory: usaInventoryFuse.search(term, { limit: 10 }).map((r) => r.item),
    }
    setResults(localResults)

    let cancelled = false
    const requestId = ++searchRequestRef.current
    setIsLoading(true)

    const run = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: "no-store" })
        if (!res.ok || cancelled || requestId !== searchRequestRef.current) return
        const data = (await res.json()) as SearchResponse
        if (cancelled || requestId !== searchRequestRef.current) return

        setCache((prev) => ({
          buyers: mergeById(prev.buyers, data.buyers),
          orders: mergeById(prev.orders, data.orders),
          bdInventory: mergeById(prev.bdInventory, data.bdInventory),
          usaInventory: mergeById(prev.usaInventory, data.usaInventory),
        }))
        setCacheAt(Date.now())

        setResults({
          buyers: mergeById(localResults.buyers, data.buyers).slice(0, 10),
          orders: mergeById(localResults.orders, data.orders).slice(0, 10),
          bdInventory: mergeById(localResults.bdInventory, data.bdInventory).slice(0, 10),
          usaInventory: mergeById(localResults.usaInventory, data.usaInventory).slice(0, 10),
        })
      } catch {
        // keep local fuse results on network error
      } finally {
        if (!cancelled && requestId === searchRequestRef.current) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, query, buyerFuse, orderFuse, bdInventoryFuse, usaInventoryFuse])

  const normalizedQuery = query.trim()

  const filteredBuyers = normalizedQuery.length < 2 ? buyers.slice(0, 10) : results.buyers
  const filteredOrders = normalizedQuery.length < 2 ? orders.slice(0, 10) : results.orders
  const filteredBdInventory = normalizedQuery.length < 2 ? [] : results.bdInventory
  const filteredUsaInventory = normalizedQuery.length < 2 ? [] : results.usaInventory

  const hasAnyResults =
    filteredBdInventory.length > 0 ||
    filteredUsaInventory.length > 0 ||
    filteredBuyers.length > 0 ||
    filteredOrders.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 mb-2 flex w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-[#E8C8CC] bg-white px-3 py-2 text-left text-xs text-[#5D4548] hover:bg-[#FCEEF0]"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <span className="ml-auto rounded border border-[#E8C8CC] px-1.5 py-0.5 text-[10px] text-[#8B6F74]">Cmd+K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search buyers or orders..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading && normalizedQuery.length >= 2 ? (
              <p className="animate-pulse text-sm text-[#8B6F74]">Searching...</p>
            ) : normalizedQuery.length >= 2 && !hasAnyResults ? (
              <div className="space-y-3">
                <p>No results found for: {normalizedQuery}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#E8C8CC] text-[#BA4E5A] hover:bg-[#FCEEF0]"
                  onClick={() => {
                    setOpen(false)
                    setPrefilledProduct(null)
                    setBlankOrderDrawerOpen(true)
                  }}
                >
                  + Create New Order
                </Button>
              </div>
            ) : (
              "No results found."
            )}
          </CommandEmpty>
          {normalizedQuery.length >= 2 && filteredBdInventory.length > 0 ? (
            <CommandGroup heading="BD Stock">
              {filteredBdInventory.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    setOpen(false)
                    router.push("/inventory/bd")
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {item.productName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.brand ?? "-"} {item.shade ? ` - ${item.shade}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`text-xs font-medium ${
                          item.qty > 2 ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {item.qty} in stock
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBdt(item.sellPriceBdt)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-[#E8C8CC] text-[#BA4E5A] hover:bg-[#FCEEF0]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPrefilledProduct({
                            productName: item.productName,
                            brand: item.brand,
                            shade: item.shade,
                            source: "BD_STOCK",
                            sellPriceBdt: item.sellPriceBdt,
                          })
                          setOpen(false)
                          setOrderDrawerOpen(true)
                        }}
                      >
                        + Add to Order
                      </Button>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {normalizedQuery.length >= 2 && filteredUsaInventory.length > 0 ? (
            <CommandGroup heading="USA Stock">
              {filteredUsaInventory.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    setOpen(false)
                    router.push("/inventory/usa")
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 rounded-full bg-[#C4878E]" />
                        {item.productName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.brand ?? "-"} {item.shade ? ` - ${item.shade}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`text-xs font-medium ${
                          item.qty > 2 ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {item.qty} in stock
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatUsd(item.buyPriceUsd)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-[#E8C8CC] text-[#BA4E5A] hover:bg-[#FCEEF0]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPrefilledProduct({
                            productName: item.productName,
                            brand: item.brand,
                            shade: item.shade,
                            source: "USA_STOCK",
                            buyPriceUsd: item.buyPriceUsd,
                          })
                          setOpen(false)
                          setOrderDrawerOpen(true)
                        }}
                      >
                        + Add to Order
                      </Button>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandGroup heading="Buyers">
            {filteredBuyers.map((buyer) => (
              <CommandItem
                key={buyer.id}
                onSelect={() => {
                  setOpen(false)
                  router.push(`/buyers/${buyer.id}`)
                }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{buyer.name}</span>
                  {buyer.phone ? (
                    <span className="text-xs text-muted-foreground">{buyer.phone}</span>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Orders">
            {filteredOrders.map((order) => (
              <CommandItem
                key={order.id}
                onSelect={() => {
                  setOpen(false)
                  router.push(`/orders/${order.id}`)
                }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {order.productName}
                    {order.brand ? ` - ${order.brand}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {order.buyerName ?? "Unknown buyer"} - {order.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {prefilledProduct ? (
        <OrderDrawer
          mode="add"
          open={orderDrawerOpen}
          onOpenChange={(next) => {
            setOrderDrawerOpen(next)
            if (!next) setPrefilledProduct(null)
          }}
          defaultProductName={prefilledProduct.productName}
          defaultBrand={prefilledProduct.brand}
          defaultShade={prefilledProduct.shade}
          defaultSource={prefilledProduct.source}
          defaultSellPrice={prefilledProduct.sellPriceBdt}
          onSuccess={() => {
            setOrderDrawerOpen(false)
            setPrefilledProduct(null)
          }}
        />
      ) : null}

      <OrderDrawer
        mode="add"
        open={blankOrderDrawerOpen}
        onOpenChange={setBlankOrderDrawerOpen}
        onSuccess={() => {
          setBlankOrderDrawerOpen(false)
        }}
      />
    </>
  )
}

