"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type InventoryType = "bd" | "usa"

export type BdInventoryItem = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  buyPriceBdt: number | null
  sellPriceBdt: number | null
  updatedAt: string
}

export type UsaInventoryItem = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  buyPriceUsd: number | null
  weightG: number | null
  updatedAt: string
}

type InventoryDrawerProps = {
  type: InventoryType
  mode: "add" | "edit"
  item?: BdInventoryItem | UsaInventoryItem
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: (item: BdInventoryItem | UsaInventoryItem) => void
}

type FormState = {
  productName: string
  brand: string
  shade: string
  qty: string
  buyPriceBdt: string
  sellPriceBdt: string
  buyPriceUsd: string
  weightG: string
}

function toFormState(type: InventoryType, item?: BdInventoryItem | UsaInventoryItem): FormState {
  if (!item) {
    return {
      productName: "",
      brand: "",
      shade: "",
      qty: "0",
      buyPriceBdt: "",
      sellPriceBdt: "",
      buyPriceUsd: "",
      weightG: "",
    }
  }

  if (type === "bd") {
    const bd = item as BdInventoryItem
    return {
      productName: bd.productName ?? "",
      brand: bd.brand ?? "",
      shade: bd.shade ?? "",
      qty: String(bd.qty ?? 0),
      buyPriceBdt: bd.buyPriceBdt == null ? "" : String(bd.buyPriceBdt),
      sellPriceBdt: bd.sellPriceBdt == null ? "" : String(bd.sellPriceBdt),
      buyPriceUsd: "",
      weightG: "",
    }
  }

  const usa = item as UsaInventoryItem
  return {
    productName: usa.productName ?? "",
    brand: usa.brand ?? "",
    shade: usa.shade ?? "",
    qty: String(usa.qty ?? 0),
    buyPriceBdt: "",
    sellPriceBdt: "",
    buyPriceUsd: usa.buyPriceUsd == null ? "" : String(usa.buyPriceUsd),
    weightG: usa.weightG == null ? "" : String(usa.weightG),
  }
}

export default function InventoryDrawer({
  type,
  mode,
  item,
  trigger,
  open,
  onOpenChange,
  onSaved,
}: InventoryDrawerProps) {
  const isControlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>(() => toFormState(type, item))
  const [productSuggestions, setProductSuggestions] = useState<string[]>([])
  const [productFocused, setProductFocused] = useState(false)
  const [showProductError, setShowProductError] = useState(false)

  const drawerOpen = isControlled ? !!open : internalOpen

  const setDrawerOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!drawerOpen) return
    setForm(toFormState(type, item))
    setShowProductError(false)
  }, [drawerOpen, type, item])

  useEffect(() => {
    if (!drawerOpen) return
    const term = form.productName.trim().toLowerCase()
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`/api/inventory/${type}`, { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as Array<BdInventoryItem | UsaInventoryItem>
        if (cancelled) return

        const names = Array.from(
          new Set(
            data
              .map((row) => row.productName)
              .filter((name): name is string => Boolean(name))
          )
        )
        const filtered = term ? names.filter((n) => n.toLowerCase().includes(term)) : names
        setProductSuggestions(filtered.slice(0, 10))
      } catch {
        if (!cancelled) setProductSuggestions([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [drawerOpen, form.productName, type])

  const title = useMemo(
    () => `${mode === "add" ? "Add" : "Edit"} ${type.toUpperCase()} Inventory Item`,
    [mode, type]
  )

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const productName = form.productName.trim()
    if (!productName) {
      setShowProductError(true)
      return
    }

    setSubmitting(true)
    try {
      const payload =
        type === "bd"
          ? {
              productName,
              brand: form.brand.trim() || undefined,
              shade: form.shade.trim() || undefined,
              qty: Number(form.qty || 0),
              buyPriceBdt: form.buyPriceBdt.trim() ? Number(form.buyPriceBdt) : undefined,
              sellPriceBdt: form.sellPriceBdt.trim() ? Number(form.sellPriceBdt) : undefined,
            }
          : {
              productName,
              brand: form.brand.trim() || undefined,
              shade: form.shade.trim() || undefined,
              qty: Number(form.qty || 0),
              buyPriceUsd: form.buyPriceUsd.trim() ? Number(form.buyPriceUsd) : undefined,
              weightG: form.weightG.trim() ? Number(form.weightG) : undefined,
            }

      const url =
        mode === "add" ? `/api/inventory/${type}` : `/api/inventory/${type}/${item?.id ?? ""}`
      const method = mode === "add" ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save item.")
        return
      }

      toast.success("Item saved")
      setDrawerOpen(false)
      onSaved?.(data as BdInventoryItem | UsaInventoryItem)
    } catch {
      toast.error("Failed to save item.")
    } finally {
      setSubmitting(false)
    }
  }

  const drawerBody = (
    <>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>Save inventory details.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="relative">
          <Input
            value={form.productName}
            placeholder="Product"
            className={cn(showProductError ? "border-red-500 focus-visible:ring-red-500" : "")}
            onFocus={() => setProductFocused(true)}
            onBlur={() => setTimeout(() => setProductFocused(false), 120)}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, productName: e.target.value }))
              if (e.target.value.trim()) setShowProductError(false)
            }}
          />
          {productFocused && productSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow">
              {productSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, productName: name }))
                    setProductFocused(false)
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          value={form.brand}
          placeholder="Brand"
          onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
        />
        <Input
          value={form.shade}
          placeholder="Shade"
          onChange={(e) => setForm((prev) => ({ ...prev, shade: e.target.value }))}
        />
        <Input
          type="number"
          value={form.qty}
          placeholder="Qty"
          onChange={(e) => setForm((prev) => ({ ...prev, qty: e.target.value }))}
        />

        {type === "bd" ? (
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              value={form.buyPriceBdt}
              placeholder="Buy Price (BDT)"
              onChange={(e) => setForm((prev) => ({ ...prev, buyPriceBdt: e.target.value }))}
            />
            <Input
              type="number"
              value={form.sellPriceBdt}
              placeholder="Sell Price (BDT)"
              onChange={(e) => setForm((prev) => ({ ...prev, sellPriceBdt: e.target.value }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              value={form.buyPriceUsd}
              placeholder="Buy Price (USD)"
              onChange={(e) => setForm((prev) => ({ ...prev, buyPriceUsd: e.target.value }))}
            />
            <Input
              type="number"
              value={form.weightG}
              placeholder="Weight (g)"
              onChange={(e) => setForm((prev) => ({ ...prev, weightG: e.target.value }))}
            />
          </div>
        )}

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
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
          {drawerBody}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        {drawerBody}
      </SheetContent>
    </Sheet>
  )
}
