"use client"
/* eslint-disable @next/next/no-img-element */

import { ImageIcon, Loader2, Upload } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
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
  tags: string[]
  imageUrl: string | null
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
  tags: string[]
  imageUrl: string | null
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

type ScanResult = {
  name: string
  brand: string
  shade: string
  description: string
  weightG: number | null
  dimension: string
  images: string[]
  lowestPrice: number | null
  stores: Array<{
    name: string
    price: number | null
  }>
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
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [productFocused, setProductFocused] = useState(false)
  const [showProductError, setShowProductError] = useState(false)
  const [upcInput, setUpcInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState("")
  const [autoFilledFields, setAutoFilledFields] = useState<{
    productName: boolean
    brand: boolean
    shade: boolean
    weightG: boolean
    imageUrl: boolean
  }>({
    productName: false,
    brand: false,
    shade: false,
    weightG: false,
    imageUrl: false,
  })

  const upcInputRef = useRef<HTMLInputElement | null>(null)
  const productNameRef = useRef<HTMLInputElement | null>(null)

  const drawerOpen = isControlled ? !!open : internalOpen

  const setDrawerOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!drawerOpen) {
      setImageUrl("")
      setUploading(false)
      setLightboxOpen(false)
      return
    }
    setForm(toFormState(type, item))
    setSelectedTags(item?.tags ?? [])
    setImageUrl(item?.imageUrl ?? "")
    setUploading(false)
    setLightboxOpen(false)
    setUpcInput("")
    setScanning(false)
    setScanResult(null)
    setScanError("")
    setAutoFilledFields({
      productName: false,
      brand: false,
      shade: false,
      weightG: false,
      imageUrl: false,
    })
    setShowProductError(false)
  }, [drawerOpen, type, item])

  useEffect(() => {
    if (!drawerOpen || mode !== "add") return
    const timer = setTimeout(() => {
      upcInputRef.current?.focus()
    }, 80)
    return () => clearTimeout(timer)
  }, [drawerOpen, mode])

  useEffect(() => {
    if (!drawerOpen) return
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch("/api/settings/tags", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { tags?: string[] }
        if (cancelled) return
        setAvailableTags(Array.isArray(data?.tags) ? data.tags : [])
      } catch {
        if (!cancelled) setAvailableTags([])
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [drawerOpen])

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

  const autoFillFromScan = (product: ScanResult) => {
    const nextAutoFilled = {
      productName: false,
      brand: false,
      shade: false,
      weightG: false,
      imageUrl: false,
    }

    setForm((prev) => {
      const next = { ...prev }

      if (!prev.productName.trim() && product.name.trim()) {
        next.productName = product.name.trim()
        nextAutoFilled.productName = true
      }
      if (!prev.brand.trim() && product.brand.trim()) {
        next.brand = product.brand.trim()
        nextAutoFilled.brand = true
      }
      if (!prev.shade.trim() && product.shade.trim()) {
        next.shade = product.shade.trim()
        nextAutoFilled.shade = true
      }
      if (type === "usa" && !prev.weightG.trim() && product.weightG != null) {
        next.weightG = String(product.weightG)
        nextAutoFilled.weightG = true
      }

      return next
    })

    const scannedImage = product.images[0] || ""
    if (!imageUrl.trim() && scannedImage) {
      setImageUrl(scannedImage)
      nextAutoFilled.imageUrl = true
    }

    setAutoFilledFields(nextAutoFilled)

    setTimeout(() => {
      productNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 120)
  }

  const runUpcScan = async () => {
    const raw = upcInput.trim()
    if (!raw || scanning) return
    setScanning(true)
    setScanError("")
    setScanResult(null)

    try {
      const res = await fetch(`/api/upc?upc=${encodeURIComponent(raw)}`, { cache: "no-store" })
      const data = await res.json()

      if (!res.ok || !data?.found) {
        setScanError(data?.error || "Product not found. Fill in details manually.")
        return
      }

      const product = data.product as ScanResult
      setScanResult(product)
      autoFillFromScan(product)
    } catch {
      setScanError("UPC lookup failed")
    } finally {
      setScanning(false)
    }
  }

  const clearScan = () => {
    setUpcInput("")
    setScanResult(null)
    setScanError("")
    setScanning(false)

    setForm((prev) => ({
      ...prev,
      productName: autoFilledFields.productName ? "" : prev.productName,
      brand: autoFilledFields.brand ? "" : prev.brand,
      shade: autoFilledFields.shade ? "" : prev.shade,
      weightG: autoFilledFields.weightG ? "" : prev.weightG,
    }))
    if (autoFilledFields.imageUrl) {
      setImageUrl("")
    }
    setAutoFilledFields({
      productName: false,
      brand: false,
      shade: false,
      weightG: false,
      imageUrl: false,
    })
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("Image too large. Max 5MB.")
      e.target.value = ""
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data?.error || "Upload failed")
        return
      }

      setImageUrl(String(data?.url ?? ""))
      toast.success("Image uploaded")
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

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
              tags: selectedTags,
              imageUrl: imageUrl.trim(),
              buyPriceBdt: form.buyPriceBdt.trim() ? Number(form.buyPriceBdt) : undefined,
              sellPriceBdt: form.sellPriceBdt.trim() ? Number(form.sellPriceBdt) : undefined,
            }
          : {
              productName,
              brand: form.brand.trim() || undefined,
              shade: form.shade.trim() || undefined,
              qty: Number(form.qty || 0),
              tags: selectedTags,
              imageUrl: imageUrl.trim(),
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
      </SheetHeader>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "add" ? (
          <div className="mb-4 border-b border-[#EDE0E2] pb-4">
            <div className="rounded-xl border border-[#EDE0E2] bg-[#F7F3F4] p-4">
              <div className="flex gap-2">
                <Input
                  id="barcode-upc"
                  ref={upcInputRef}
                  value={upcInput}
                  placeholder="Scan or type UPC barcode..."
                  disabled={scanning}
                  onChange={(e) => setUpcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void runUpcScan()
                    }
                  }}
                />
                <Button
                  type="button"
                  className="bg-[#C4878E] text-white hover:bg-[#A86870]"
                  disabled={scanning}
                  onClick={() => void runUpcScan()}
                >
                  {scanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    "Look Up"
                  )}
                </Button>
              </div>

              {scanError ? <p className="mt-2 text-sm text-[#C4878E]">{scanError}</p> : null}

              {scanResult ? (
                <div className="mt-3 space-y-2 rounded-lg border border-green-200 bg-[#F0FDF4] p-3">
                  <p className="text-sm font-medium text-green-700">Found: {scanResult.name || "Product"}</p>
                  <p className="text-xs text-green-700">
                    Brand: {scanResult.brand || "-"} - Shade: {scanResult.shade || "-"}
                  </p>
                  {scanResult.images.length > 0 ? (
                    <div className="flex gap-2">
                      {scanResult.images.slice(0, 3).map((url, idx) => (
                        <img
                          key={`${url}-${idx}`}
                          src={url}
                          alt={`Scanned preview ${idx + 1}`}
                          className="h-12 w-12 rounded-md border border-[#EDE0E2] object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {(scanResult || scanError || upcInput) ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-[#8B6F74] underline hover:text-[#5D4548]"
                  onClick={clearScan}
                >
                  Clear scan
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="product-name" className="text-sm font-medium text-[#1E1215] mb-1 block">
            Product Name
          </label>
          <div className="relative">
            <Input
              id="product-name"
              ref={productNameRef}
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
              <div className="absolute z-20 mt-1 w-full rounded-md border border-[#EDE0E2] bg-white shadow">
                {productSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FCEEF0]"
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
        </div>

        <div>
          <label htmlFor="brand" className="text-sm font-medium text-[#1E1215] mb-1 block">
            Brand
          </label>
          <Input
            id="brand"
            value={form.brand}
            placeholder="Brand"
            onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="shade" className="text-sm font-medium text-[#1E1215] mb-1 block">
            Shade / Colour
          </label>
          <Input
            id="shade"
            value={form.shade}
            placeholder="Shade"
            onChange={(e) => setForm((prev) => ({ ...prev, shade: e.target.value }))}
          />
          <p className="text-xs text-[#A08488] mt-1">e.g. 210W, Pillow Talk, Translucent</p>
        </div>
        <div>
          <label htmlFor="qty" className="text-sm font-medium text-[#1E1215] mb-1 block">
            Quantity
          </label>
          <Input
            id="qty"
            type="number"
            value={form.qty}
            placeholder="Qty"
            onChange={(e) => setForm((prev) => ({ ...prev, qty: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          {availableTags.length === 0 ? (
            <p className="text-xs text-[#8B6F74]">No tags configured. Add tags in Settings.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const selected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]
                      )
                    }
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer",
                        selected ? "bg-[#C4878E] text-white hover:bg-[#A86870]" : ""
                      )}
                    >
                      {tag}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#1E1215] mb-1 block">Product Image</label>
          <p className="text-xs text-[#A08488] mt-1">Upload a photo or auto-filled by barcode scan</p>
          <div className="flex items-start gap-4">
            {imageUrl ? (
              <div
                className="w-24 h-24 rounded-xl overflow-hidden border border-[#EDE0E2] cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={imageUrl}
                  alt="Product"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#EDE0E2] bg-[#F7F3F4] flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-8 h-8 text-[#A08488]" />
              </div>
            )}

            <div>
              <label
                htmlFor="imageUpload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#EDE0E2] bg-white text-sm text-[#1E1215] font-medium hover:bg-[#F7F3F4] transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </>
                )}
              </label>
              <input
                id="imageUpload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {imageUrl ? (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-xs text-[#A08488] hover:text-red-400 mt-1 transition-colors block"
                >
                  x Remove image
                </button>
              ) : null}
              <p className="text-xs text-[#A08488] mt-2">Max 5MB · JPG, PNG, WebP</p>
            </div>
          </div>
        </div>

        {type === "bd" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="buy-price-bdt" className="text-sm font-medium text-[#1E1215] mb-1 block">
                Buy Price (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08488] text-sm pointer-events-none select-none">
                  {"\u09F3"}
                </span>
                <Input
                  id="buy-price-bdt"
                  type="number"
                  value={form.buyPriceBdt}
                  placeholder="Buy Price (BDT)"
                  className="pl-7"
                  onChange={(e) => setForm((prev) => ({ ...prev, buyPriceBdt: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#A08488] mt-1">What you paid per unit</p>
            </div>
            <div>
              <label htmlFor="sell-price-bdt" className="text-sm font-medium text-[#1E1215] mb-1 block">
                Sell Price (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08488] text-sm pointer-events-none select-none">
                  {"\u09F3"}
                </span>
                <Input
                  id="sell-price-bdt"
                  type="number"
                  value={form.sellPriceBdt}
                  placeholder="Sell Price (BDT)"
                  className="pl-7"
                  onChange={(e) => setForm((prev) => ({ ...prev, sellPriceBdt: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#A08488] mt-1">Your selling price to the customer</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="buy-price-usd" className="text-sm font-medium text-[#1E1215] mb-1 block">
                Buy Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08488] text-sm pointer-events-none select-none">
                  $
                </span>
                <Input
                  id="buy-price-usd"
                  type="number"
                  value={form.buyPriceUsd}
                  placeholder="Buy Price (USD)"
                  className="pl-7"
                  onChange={(e) => setForm((prev) => ({ ...prev, buyPriceUsd: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#A08488] mt-1">What you paid per unit</p>
            </div>
            <div>
              <label htmlFor="weight-g" className="text-sm font-medium text-[#1E1215] mb-1 block">
                Weight
              </label>
              <div className="relative">
                <Input
                  id="weight-g"
                  type="number"
                  value={form.weightG}
                  placeholder="Weight (g)"
                  className="pr-9"
                  onChange={(e) => setForm((prev) => ({ ...prev, weightG: e.target.value }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A08488] text-sm pointer-events-none select-none">
                  g
                </span>
              </div>
              <p className="text-xs text-[#A08488] mt-1">Weight of one unit in grams</p>
            </div>
          </div>
        )}

        <SheetFooter className="sticky bottom-0 bg-white pt-3">
          <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </form>
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-2xl p-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Product"
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          ) : null}
        </DialogContent>
      </Dialog>
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
