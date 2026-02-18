"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type BuyerData = {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  _count?: {
    orders: number
  }
  outstandingBalance?: number
}

type BuyerDrawerProps = {
  mode: "add" | "edit"
  buyer?: BuyerData
  trigger: ReactNode
}

type FormState = {
  name: string
  phone: string
  address: string
  notes: string
}

function toFormState(buyer?: BuyerData): FormState {
  return {
    name: buyer?.name ?? "",
    phone: buyer?.phone ?? "",
    address: buyer?.address ?? "",
    notes: buyer?.notes ?? "",
  }
}

export default function BuyerDrawer({ mode, buyer, trigger }: BuyerDrawerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showNameError, setShowNameError] = useState(false)
  const [form, setForm] = useState<FormState>(toFormState(buyer))

  const title = useMemo(() => (mode === "add" ? "Add Buyer" : "Edit Buyer"), [mode])

  useEffect(() => {
    if (open) {
      setForm(toFormState(buyer))
      setShowNameError(false)
    }
  }, [open, buyer])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedName = form.name.trim()

    if (!trimmedName) {
      setShowNameError(true)
      return
    }

    setSubmitting(true)
    try {
      const url = mode === "add" ? "/api/buyers" : `/api/buyers/${buyer?.id ?? ""}`
      const method = mode === "add" ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: form.phone || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save buyer.")
        return
      }

      toast.success("Buyer saved")
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to save buyer.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Save buyer details.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }))
              if (showNameError && e.target.value.trim()) setShowNameError(false)
            }}
            className={cn(showNameError ? "border-red-500 focus-visible:ring-red-500" : "")}
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <Input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />
          <Textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={5}
          />

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
