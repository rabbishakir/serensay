"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type MarkBoughtOrder = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  buyerName: string
}

type MarkBoughtDialogProps = {
  order: MarkBoughtOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function MarkBoughtDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
}: MarkBoughtDialogProps) {
  const [buyPriceUsd, setBuyPriceUsd] = useState("")
  const [weightG, setWeightG] = useState("")
  const [extraQty, setExtraQty] = useState("0")
  const [submitting, setSubmitting] = useState(false)
  const [buyPriceError, setBuyPriceError] = useState(false)
  const [weightError, setWeightError] = useState(false)

  useEffect(() => {
    if (!open) return
    setBuyPriceUsd("")
    setWeightG("")
    setExtraQty("0")
    setBuyPriceError(false)
    setWeightError(false)
  }, [open, order?.id])

  const subtitle = useMemo(() => {
    if (!order) return ""
    const shadePart = order.shade ? ` ${order.shade}` : ""
    return `${order.productName}${shadePart} - for ${order.buyerName}`
  }, [order])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!order) return

    const buy = Number(buyPriceUsd)
    const weight = Number(weightG)
    const extra = Number(extraQty || "0")

    const invalidBuy = !Number.isFinite(buy) || buy <= 0
    const invalidWeight = !Number.isFinite(weight) || weight <= 0
    setBuyPriceError(invalidBuy)
    setWeightError(invalidWeight)

    if (invalidBuy || invalidWeight) return
    if (!Number.isInteger(extra) || extra < 0) {
      toast.error("Extra units must be 0 or a positive integer.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyPriceUsd: buy,
          weightG: weight,
          extraQty: extra,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to mark order as purchased.")
        return
      }

      onOpenChange(false)
      onSuccess()

      const message = extra > 0 ? `${data.message} Check USA Inventory to confirm.` : data.message
      toast.success(message)
    } catch {
      toast.error("Failed to mark order as purchased.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Purchased</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Units for this order</p>
            <p className="text-sm text-[#5D4548]">{order?.qty ?? 0}</p>
            <p className="text-xs text-[#8B6F74]">locked to order quantity</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Extra units for USA stock</p>
            <Input
              type="number"
              min={0}
              value={extraQty}
              placeholder="0"
              onChange={(e) => setExtraQty(e.target.value)}
            />
            <p className="text-xs text-[#8B6F74]">Enter 0 if you only bought for this order</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Buy price per unit (USD)</p>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={buyPriceUsd}
              placeholder="0.00"
              className={cn(buyPriceError ? "border-red-500 focus-visible:ring-red-500" : "")}
              onChange={(e) => {
                setBuyPriceUsd(e.target.value)
                if (Number(e.target.value) > 0) setBuyPriceError(false)
              }}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Weight per unit (grams)</p>
            <Input
              type="number"
              min={1}
              required
              value={weightG}
              placeholder="85"
              className={cn(weightError ? "border-red-500 focus-visible:ring-red-500" : "")}
              onChange={(e) => {
                setWeightG(e.target.value)
                if (Number(e.target.value) > 0) setWeightError(false)
              }}
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
