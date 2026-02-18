"use client"

import Fuse from "fuse.js"
import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

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
}

const CACHE_TTL_MS = 60_000

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
  const [cache, setCache] = useState<SearchResponse>({ buyers: [], orders: [] })
  const [cacheAt, setCacheAt] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  const isCacheStale = !cacheAt || Date.now() - cacheAt > CACHE_TTL_MS

  const hydrateCache = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/search?q=", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as SearchResponse
      setCache(data)
      setCacheAt(Date.now())
    } finally {
      setLoading(false)
    }
  }

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
    if (!open) return
    if (cache.buyers.length === 0 || cache.orders.length === 0 || isCacheStale) {
      void hydrateCache()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || query.trim().length < 2) return

    let cancelled = false
    const run = async () => {
      const term = encodeURIComponent(query.trim())
      const res = await fetch(`/api/search?q=${term}`, { cache: "no-store" })
      if (!res.ok || cancelled) return
      const data = (await res.json()) as SearchResponse
      if (cancelled) return

      setCache((prev) => ({
        buyers: mergeById(prev.buyers, data.buyers),
        orders: mergeById(prev.orders, data.orders),
      }))
      setCacheAt(Date.now())
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, query])

  const buyerFuse = useMemo(
    () =>
      new Fuse(cache.buyers, {
        keys: ["name", "phone"],
        threshold: 0.35,
      }),
    [cache.buyers]
  )

  const orderFuse = useMemo(
    () =>
      new Fuse(cache.orders, {
        keys: ["productName", "brand", "buyerName", "status"],
        threshold: 0.35,
      }),
    [cache.orders]
  )

  const normalizedQuery = query.trim()
  const filteredBuyers = useMemo(() => {
    if (!normalizedQuery) return cache.buyers.slice(0, 10)
    return buyerFuse.search(normalizedQuery, { limit: 10 }).map((r) => r.item)
  }, [buyerFuse, cache.buyers, normalizedQuery])

  const filteredOrders = useMemo(() => {
    if (!normalizedQuery) return cache.orders.slice(0, 10)
    return orderFuse.search(normalizedQuery, { limit: 10 }).map((r) => r.item)
  }, [orderFuse, cache.orders, normalizedQuery])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 mb-2 flex w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <span className="ml-auto rounded border border-white/20 px-1.5 py-0.5 text-[10px]">⌘K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search buyers or orders..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{loading ? "Loading..." : "No results found."}</CommandEmpty>
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
    </>
  )
}
