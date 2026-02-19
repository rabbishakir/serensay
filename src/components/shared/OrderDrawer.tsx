"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type SourceValue = "BD_STOCK" | "USA_STOCK" | "PRE_ORDER"
type StatusValue =
  | "TO_BE_PURCHASED"
  | "PURCHASED"
  | "IN_TRANSIT"
  | "IN_BANGLADESH"
  | "DELIVERED"
  | "RETURNED"

type BuyerSuggestion = {
  id: string
  name: string
  phone: string | null
}

type InventoryLookupItem = {
  id: string
  productName: string
  qty: number
}

type StockIndicator = {
  text: string
  tone: "green" | "amber" | "red" | "muted"
}

export type OrderData = {
  id: string
  buyerId: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  sellPriceBdt: number
  buyPriceUsd: number | null
  depositBdt: number
  source: SourceValue
  status: StatusValue
  batchId: string | null
  notes: string | null
  createdAt: string
  buyer?: {
    name?: string | null
  }
}

type OrderDrawerProps = {
  mode: "add" | "edit"
  order?: OrderData
  defaultBuyerId?: string
  defaultBuyerName?: string
  defaultProductName?: string
  defaultBrand?: string | null
  defaultShade?: string | null
  defaultSource?: SourceValue
  defaultSellPrice?: number | null
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: (order: OrderData) => void
  onSuccess?: () => void
}

type FormState = {
  buyerId: string
  buyerNameInput: string
  productName: string
  brand: string
  shade: string
  qty: string
  sellPriceBdt: string
  buyPriceUsd: string
  depositBdt: string
  source: SourceValue
  status: StatusValue
  batchId: string
  notes: string
}

const SOURCE_OPTIONS: { label: string; value: SourceValue }[] = [
  { label: "BD Stock", value: "BD_STOCK" },
  { label: "USA Stock", value: "USA_STOCK" },
  { label: "Pre-Order", value: "PRE_ORDER" },
]

const STATUS_OPTIONS: { label: string; value: StatusValue }[] = [
  { label: "To Be Purchased", value: "TO_BE_PURCHASED" },
  { label: "Purchased", value: "PURCHASED" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "In Bangladesh", value: "IN_BANGLADESH" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Returned", value: "RETURNED" },
]

const SOURCE_DEFAULT_STATUS: Record<SourceValue, StatusValue> = {
  BD_STOCK: "IN_BANGLADESH",
  USA_STOCK: "PURCHASED",
  PRE_ORDER: "TO_BE_PURCHASED",
}

function toFormState(
  mode: "add" | "edit",
  order?: OrderData,
  defaultBuyerId?: string,
  defaultBuyerName?: string,
  defaultProductName?: string,
  defaultBrand?: string | null,
  defaultShade?: string | null,
  defaultSource?: SourceValue,
  defaultSellPrice?: number | null
): FormState {
  if (mode === "edit" && order) {
    return {
      buyerId: order.buyerId,
      buyerNameInput: order.buyer?.name ?? "",
      productName: order.productName,
      brand: order.brand ?? "",
      shade: order.shade ?? "",
      qty: String(order.qty ?? 1),
      sellPriceBdt: String(order.sellPriceBdt ?? 0),
      buyPriceUsd: order.buyPriceUsd == null ? "" : String(order.buyPriceUsd),
      depositBdt: String(order.depositBdt ?? 0),
      source: order.source,
      status: order.status,
      batchId: order.batchId ?? "",
      notes: order.notes ?? "",
    }
  }

  const source = defaultSource ?? "PRE_ORDER"
  return {
    buyerId: defaultBuyerId ?? "",
    buyerNameInput: defaultBuyerName ?? "",
    productName: defaultProductName ?? "",
    brand: defaultBrand ?? "",
    shade: defaultShade ?? "",
    qty: "1",
    sellPriceBdt: defaultSellPrice == null ? "" : String(defaultSellPrice),
    buyPriceUsd: "",
    depositBdt: "0",
    source,
    status: SOURCE_DEFAULT_STATUS[source],
    batchId: "",
    notes: "",
  }
}

export default function OrderDrawer({
  mode,
  order,
  defaultBuyerId,
  defaultBuyerName,
  defaultProductName,
  defaultBrand,
  defaultShade,
  defaultSource,
  defaultSellPrice,
  trigger,
  open,
  onOpenChange,
  onSaved,
  onSuccess,
}: OrderDrawerProps) {
  const isControlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>(() =>
    toFormState(
      mode,
      order,
      defaultBuyerId,
      defaultBuyerName,
      defaultProductName,
      defaultBrand,
      defaultShade,
      defaultSource,
      defaultSellPrice
    )
  )
  const [buyerSuggestions, setBuyerSuggestions] = useState<BuyerSuggestion[]>([])
  const [productSuggestions, setProductSuggestions] = useState<string[]>([])
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([])
  const [buyerFieldFocused, setBuyerFieldFocused] = useState(false)
  const [productFieldFocused, setProductFieldFocused] = useState(false)
  const [brandFieldFocused, setBrandFieldFocused] = useState(false)
  const [showBuyerError, setShowBuyerError] = useState(false)
  const [showSellError, setShowSellError] = useState(false)
  const [stockIndicator, setStockIndicator] = useState<StockIndicator | null>(null)

  const drawerOpen = isControlled ? open : internalOpen
  const setDrawerOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  const buyerReadOnly = mode === "add" && !!defaultBuyerId

  useEffect(() => {
    if (!drawerOpen) return
    setForm(
      toFormState(
        mode,
        order,
        defaultBuyerId,
        defaultBuyerName,
        defaultProductName,
        defaultBrand,
        defaultShade,
        defaultSource,
        defaultSellPrice
      )
    )
    setShowBuyerError(false)
    setShowSellError(false)
    setBuyerSuggestions([])
    setProductSuggestions([])
    setBrandSuggestions([])
    setStockIndicator(null)
  }, [
    drawerOpen,
    mode,
    order,
    defaultBuyerId,
    defaultBuyerName,
    defaultProductName,
    defaultBrand,
    defaultShade,
    defaultSource,
    defaultSellPrice,
  ])

  useEffect(() => {
    if (!drawerOpen) return

    const sourceLabel = form.source === "BD_STOCK" ? "BD" : "USA"
    const term = form.productName.trim()
    if (!term || form.source === "PRE_ORDER") {
      setStockIndicator(null)
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const endpoint =
          form.source === "BD_STOCK" ? "/api/inventory/bd" : "/api/inventory/usa"
        const res = await fetch(
          `${endpoint}?search=${encodeURIComponent(term)}`,
          { cache: "no-store" }
        )
        if (!res.ok || cancelled) return
        const data = (await res.json()) as InventoryLookupItem[]
        if (cancelled) return

        const match =
          data.find((item) => item.productName.toLowerCase() === term.toLowerCase()) ?? null
        if (!match) {
          setStockIndicator({ text: "Not found in inventory", tone: "muted" })
          return
        }

        if (match.qty === 0) {
          setStockIndicator({
            text: "Out of stock - will be treated as pre-order",
            tone: "red",
          })
          return
        }

        if (match.qty <= 2) {
          setStockIndicator({
            text: `Only ${match.qty} left in stock`,
            tone: "amber",
          })
          return
        }

        setStockIndicator({
          text: `${match.qty} in ${sourceLabel} stock`,
          tone: "green",
        })
      } catch {
        if (!cancelled) {
          setStockIndicator({ text: "Not found in inventory", tone: "muted" })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [drawerOpen, form.productName, form.source])

  useEffect(() => {
    if (!drawerOpen || buyerReadOnly) return
    const term = form.buyerNameInput.trim()
    if (term.length < 1) {
      setBuyerSuggestions([])
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/buyers?search=${encodeURIComponent(term)}`, {
          cache: "no-store",
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as Array<{ id: string; name: string; phone: string | null }>
        if (cancelled) return
        const normalized = term.toLowerCase()
        const filtered = data
          .filter(
            (b) =>
              b.name.toLowerCase().includes(normalized) ||
              (b.phone ? b.phone.includes(term.trim()) : false)
          )
          .slice(0, 8)
          .map((b) => ({ id: b.id, name: b.name, phone: b.phone }))
        setBuyerSuggestions(filtered)
      } catch {
        if (!cancelled) setBuyerSuggestions([])
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [form.buyerNameInput, drawerOpen, buyerReadOnly])

  useEffect(() => {
    if (!drawerOpen) return
    const term = form.productName.trim()
    if (term.length < 1) {
      setProductSuggestions([])
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/orders/autocomplete?field=productName", {
          cache: "no-store",
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { values: string[] }
        if (cancelled) return
        const normalized = term.toLowerCase()
        setProductSuggestions(
          data.values
            .filter((v) => v.toLowerCase().includes(normalized))
            .slice(0, 8)
        )
      } catch {
        if (!cancelled) setProductSuggestions([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [form.productName, drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    const term = form.brand.trim()
    if (term.length < 1) {
      setBrandSuggestions([])
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/orders/autocomplete?field=brand", {
          cache: "no-store",
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { values: string[] }
        if (cancelled) return
        const normalized = term.toLowerCase()
        setBrandSuggestions(
          data.values
            .filter((v) => v.toLowerCase().includes(normalized))
            .slice(0, 8)
        )
      } catch {
        if (!cancelled) setBrandSuggestions([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [form.brand, drawerOpen])

  const balanceDue = useMemo(() => {
    const sell = Number(form.sellPriceBdt || "0")
    const deposit = Number(form.depositBdt || "0")
    return sell - deposit
  }, [form.depositBdt, form.sellPriceBdt])

  const title = mode === "add" ? "Add Order" : "Edit Order"

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const buyerName = form.buyerNameInput.trim()
    const sellPrice = Number(form.sellPriceBdt)
    const buyerMissing = !form.buyerId && !buyerName
    const sellMissing = form.sellPriceBdt.trim() === "" || Number.isNaN(sellPrice)

    setShowBuyerError(buyerMissing)
    setShowSellError(sellMissing)
    if (buyerMissing || sellMissing) return

    setSubmitting(true)
    try {
      let buyerId = form.buyerId

      if (!buyerId) {
        const createBuyerRes = await fetch("/api/buyers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: buyerName }),
        })
        const buyerData = await createBuyerRes.json()
        if (!createBuyerRes.ok) {
          toast.error(buyerData?.error ?? "Failed to create buyer.")
          return
        }
        buyerId = buyerData.id as string
      }

      const payload = {
        buyerId,
        productName: form.productName.trim() || "Untitled Product",
        brand: form.brand.trim() || undefined,
        shade: form.shade.trim() || undefined,
        qty: Math.max(1, Number(form.qty || "1")),
        sellPriceBdt: Math.max(0, sellPrice),
        buyPriceUsd:
          form.buyPriceUsd.trim() === "" ? undefined : Math.max(0, Number(form.buyPriceUsd)),
        depositBdt:
          form.depositBdt.trim() === "" ? 0 : Math.max(0, Number(form.depositBdt)),
        source: form.source,
        status: form.status,
        batchId: form.batchId.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }

      const url = mode === "add" ? "/api/orders" : `/api/orders/${order?.id ?? ""}`
      const method = mode === "add" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save order.")
        return
      }

      const savedOrder =
        mode === "add" && data && typeof data === "object" && "order" in data
          ? ((data as { order: OrderData }).order as OrderData)
          : (data as OrderData)

      if (mode === "add" && data && typeof data === "object" && "warning" in data) {
        const warning = (data as { warning: string | null }).warning
        if (warning) {
          toast.warning(warning)
        } else {
          toast.success("Order saved")
        }
      } else {
        toast.success("Order saved")
      }

      setDrawerOpen(false)
      onSaved?.(savedOrder)
      onSuccess?.()
    } catch {
      toast.error("Failed to save order.")
    } finally {
      setSubmitting(false)
    }
  }

  const drawerBody = (
    <>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>Create or update order details.</SheetDescription>
      </SheetHeader>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="relative">
          <Input
            value={form.buyerNameInput}
            readOnly={buyerReadOnly}
            placeholder="Buyer"
            className={cn(
              showBuyerError ? "border-red-500 focus-visible:ring-red-500" : "",
              buyerReadOnly ? "bg-[#FAFAFA]" : ""
            )}
            onFocus={() => setBuyerFieldFocused(true)}
            onBlur={() => setTimeout(() => setBuyerFieldFocused(false), 120)}
            onChange={(e) => {
              const value = e.target.value
              setForm((prev) => ({
                ...prev,
                buyerNameInput: value,
                buyerId:
                  prev.buyerId && prev.buyerNameInput.toLowerCase() !== value.toLowerCase()
                    ? ""
                    : prev.buyerId,
              }))
              if (value.trim()) setShowBuyerError(false)
            }}
          />
          {!buyerReadOnly && buyerFieldFocused && buyerSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-[#FAFAFA] shadow">
              {buyerSuggestions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-[#FAFAFA]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      buyerId: b.id,
                      buyerNameInput: b.name,
                    }))
                    setBuyerSuggestions([])
                    setBuyerFieldFocused(false)
                    setShowBuyerError(false)
                  }}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{b.name}</span>
                    {b.phone ? <span className="text-xs text-[#8B6F74]">{b.phone}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Input
            value={form.productName}
            placeholder="Product name"
            onFocus={() => setProductFieldFocused(true)}
            onBlur={() => setTimeout(() => setProductFieldFocused(false), 120)}
            onChange={(e) => setForm((prev) => ({ ...prev, productName: e.target.value }))}
          />
          {productFieldFocused && productSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-[#FAFAFA] shadow">
              {productSuggestions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FAFAFA]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, productName: value }))
                    setProductFieldFocused(false)
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Input
            value={form.brand}
            placeholder="Brand"
            onFocus={() => setBrandFieldFocused(true)}
            onBlur={() => setTimeout(() => setBrandFieldFocused(false), 120)}
            onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
          />
          {brandFieldFocused && brandSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-[#FAFAFA] shadow">
              {brandSuggestions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FAFAFA]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, brand: value }))
                    setBrandFieldFocused(false)
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          value={form.shade}
          placeholder="Shade"
          onChange={(e) => setForm((prev) => ({ ...prev, shade: e.target.value }))}
        />

        <div className="space-y-2">
          <p className="text-xs text-[#8B6F74]">Source</p>
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_OPTIONS.map((sourceOpt) => (
              <Button
                key={sourceOpt.value}
                type="button"
                variant={form.source === sourceOpt.value ? "default" : "outline"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    source: sourceOpt.value,
                    status: SOURCE_DEFAULT_STATUS[sourceOpt.value],
                  }))
                }
              >
                {sourceOpt.label}
              </Button>
            ))}
          </div>
        </div>

        <Select
          value={form.status}
          onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as StatusValue }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((statusOpt) => (
              <SelectItem key={statusOpt.value} value={statusOpt.value}>
                {statusOpt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={1}
            value={form.qty}
            placeholder="Qty"
            onChange={(e) => setForm((prev) => ({ ...prev, qty: e.target.value }))}
          />
          <Input
            type="number"
            min={0}
            value={form.sellPriceBdt}
            placeholder="Sell Price BDT"
            className={cn(showSellError ? "border-red-500 focus-visible:ring-red-500" : "")}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, sellPriceBdt: e.target.value }))
              if (e.target.value.trim()) setShowSellError(false)
            }}
          />
        </div>

        {stockIndicator ? (
          <p
            className={cn(
              "text-xs",
              stockIndicator.tone === "green"
                ? "text-emerald-600"
                : stockIndicator.tone === "amber"
                  ? "text-amber-600"
                  : stockIndicator.tone === "red"
                    ? "text-red-600"
                    : "text-[#8B6F74]"
            )}
          >
            {stockIndicator.text}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.buyPriceUsd}
            placeholder="Buy Price USD"
            onChange={(e) => setForm((prev) => ({ ...prev, buyPriceUsd: e.target.value }))}
          />
          <Input
            type="number"
            min={0}
            value={form.depositBdt}
            placeholder="Deposit BDT"
            onChange={(e) => setForm((prev) => ({ ...prev, depositBdt: e.target.value }))}
          />
        </div>

        <p className={cn("text-sm", balanceDue > 0 ? "text-amber-600" : "text-[#8B6F74]")}>
          Balance Due: {Number.isFinite(balanceDue) ? balanceDue.toLocaleString("en-BD") : "0"} BDT
        </p>

        <Input
          value={form.batchId}
          placeholder="Batch ID"
          onChange={(e) => setForm((prev) => ({ ...prev, batchId: e.target.value }))}
        />

        <Textarea
          rows={2}
          value={form.notes}
          placeholder="Notes"
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </form>
    </>
  )

  if (trigger) {
    return (
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
          {drawerBody}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
        {drawerBody}
      </SheetContent>
    </Sheet>
  )
}
