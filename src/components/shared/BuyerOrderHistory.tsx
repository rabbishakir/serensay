"use client"

import Link from "next/link"
import { Check, ChevronDown, Pencil, ShoppingBag, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import MarkBoughtDialog from "@/components/shared/MarkBoughtDialog"
import OrderDrawer, { type OrderData } from "@/components/shared/OrderDrawer"
import StatusBadge from "@/components/shared/StatusBadge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type BuyerOrderHistoryProps = {
  orders: OrderData[]
  buyerId: string
  buyerName: string
  onOrdersChanged: () => void
}

type StatusValue = OrderData["status"]

const ALL_STATUSES: StatusValue[] = [
  "TO_BE_PURCHASED",
  "PURCHASED",
  "IN_TRANSIT",
  "IN_BANGLADESH",
  "DELIVERED",
  "RETURNED",
]

const STATUS_LABELS: Record<StatusValue, string> = {
  TO_BE_PURCHASED: "To Be Purchased",
  PURCHASED: "Purchased",
  IN_TRANSIT: "In Transit",
  IN_BANGLADESH: "In Bangladesh",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
  })
}

function formatDue(value: number) {
  return `${"\u09F3"}${Math.max(value, 0).toLocaleString("en-BD")}`
}

export default function BuyerOrderHistory({
  orders,
  buyerId,
  buyerName,
  onOrdersChanged,
}: BuyerOrderHistoryProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editingTagsOrderId, setEditingTagsOrderId] = useState<string | null>(null)
  const [drawerOrder, setDrawerOrder] = useState<OrderData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null)
  const [markBoughtOrder, setMarkBoughtOrder] = useState<OrderData | null>(null)
  const [markBoughtOpen, setMarkBoughtOpen] = useState(false)
  const [localOrders, setLocalOrders] = useState<OrderData[]>(orders)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLocalOrders(orders)
  }, [orders])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/settings/order-tags", { cache: "no-store" })
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
  }, [])

  const deleteOrder = useMemo(
    () => localOrders.find((order) => order.id === deleteOrderId) ?? null,
    [deleteOrderId, localOrders]
  )

  const handleStatusChange = async (orderId: string, status: StatusValue) => {
    const current = localOrders.find((order) => order.id === orderId)
    if (!current || current.status === status) {
      setEditingOrderId(null)
      return
    }

    const snapshot = localOrders
    setEditingOrderId(null)
    setLocalOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    )

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update status.")
      }
      toast.success(`${current.productName} marked as ${STATUS_LABELS[status]}`)
      onOrdersChanged()
    } catch (error) {
      setLocalOrders(snapshot)
      const message = error instanceof Error ? error.message : "Failed to update status."
      toast.error(message)
    }
  }

  const handleTagsChange = async (orderId: string, nextTags: string[]) => {
    const snapshot = localOrders
    setLocalOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, tags: nextTags } : order))
    )

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: nextTags }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update tags.")
      }
      onOrdersChanged()
    } catch (error) {
      setLocalOrders(snapshot)
      const message = error instanceof Error ? error.message : "Failed to update tags."
      toast.error(message)
    }
  }

  const handleDelete = async () => {
    if (!deleteOrderId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${deleteOrderId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete order.")
      }
      setLocalOrders((prev) => prev.filter((order) => order.id !== deleteOrderId))
      setDeleteOrderId(null)
      toast.success("Order deleted")
      onOrdersChanged()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete order."
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  if (localOrders.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-10 text-center">
        <p className="text-sm text-[#8B6F74]">No orders yet.</p>
        <Button asChild size="sm" className="mt-3">
          <Link
            href={`/orders?buyerId=${encodeURIComponent(buyerId)}&buyerName=${encodeURIComponent(
              buyerName
            )}`}
          >
            + Add Order
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {localOrders.map((order) => {
          const balanceDue = order.sellPriceBdt - order.depositBdt
          const brandShade = [order.brand, order.shade].filter(Boolean).join(" - ")
          return (
            <div
              key={order.id}
              className="group rounded-lg border border-[#EDE0E2] bg-white p-4 transition-colors hover:bg-[#FAFAFA]"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-start">
                <div className="min-w-0">
                  <p className="text-xs text-[#A08488]">{formatDate(order.createdAt)}</p>
                  <p className="truncate font-semibold text-[#1E1215]">{order.productName}</p>
                  {brandShade ? <p className="truncate text-xs text-[#A08488]">{brandShade}</p> : null}
                </div>

                <div className="space-y-2">
                  <Popover
                    open={editingOrderId === order.id}
                    onOpenChange={(open) => setEditingOrderId(open ? order.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md hover:bg-[#FCEEF0] p-1"
                      >
                        <StatusBadge status={order.status} />
                        <ChevronDown className="h-3 w-3 text-[#A08488]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="start">
                      <Command className="bg-transparent">
                        <CommandEmpty>No status found.</CommandEmpty>
                        <CommandGroup>
                          {ALL_STATUSES.map((status) => (
                            <CommandItem
                              key={status}
                              onSelect={() => void handleStatusChange(order.id, status)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[#FCEEF0] text-[#1E1215]"
                            >
                              <StatusBadge status={status} />
                              {order.status === status ? (
                                <Check className="ml-auto h-3 w-3 text-[#C4878E]" />
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {order.tags.map((tag) => (
                      <Badge
                        key={`${order.id}-${tag}`}
                        variant="outline"
                        className="gap-1 border-[#E8C8CC] text-[#5D4548]"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          className="text-[#A08488] hover:text-red-500"
                          onClick={() =>
                            void handleTagsChange(
                              order.id,
                              order.tags.filter((value) => value !== tag)
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}

                    <Popover
                      open={editingTagsOrderId === order.id}
                      onOpenChange={(open) => setEditingTagsOrderId(open ? order.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-xs text-[#A08488] border border-dashed border-[#E8C8CC] rounded-full px-2 py-0.5 hover:border-[#C4878E] hover:text-[#C4878E] transition-colors"
                        >
                          + tag
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1" align="start">
                        {availableTags.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[#A08488]">No tags configured.</p>
                        ) : (
                          availableTags.map((tag) => {
                            const hasTag = order.tags.includes(tag)
                            const nextTags = hasTag
                              ? order.tags.filter((value) => value !== tag)
                              : [...order.tags, tag]
                            return (
                              <button
                                key={`${order.id}-available-${tag}`}
                                type="button"
                                onClick={() => void handleTagsChange(order.id, nextTags)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[#FCEEF0] text-[#1E1215]"
                              >
                                <span>{tag}</span>
                                {hasTag ? <Check className="ml-auto h-3 w-3 text-[#C4878E]" /> : null}
                              </button>
                            )
                          })
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setDrawerOrder(order)
                            setDrawerOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>

                    {order.status === "TO_BE_PURCHASED" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-amber-500 hover:text-amber-600"
                            onClick={() => {
                              setMarkBoughtOrder(order)
                              setMarkBoughtOpen(true)
                            }}
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark Bought</TooltipContent>
                      </Tooltip>
                    ) : null}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => setDeleteOrderId(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>

                  {balanceDue > 0 ? (
                    <p className="mt-1 text-xs font-medium text-[#C4878E]">{formatDue(balanceDue)} due</p>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <OrderDrawer
        mode="edit"
        order={drawerOrder ?? undefined}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setDrawerOrder(null)
        }}
        onSuccess={() => {
          setDrawerOpen(false)
          setDrawerOrder(null)
          onOrdersChanged()
        }}
      />

      <MarkBoughtDialog
        order={
          markBoughtOrder
            ? {
                id: markBoughtOrder.id,
                productName: markBoughtOrder.productName,
                brand: markBoughtOrder.brand,
                shade: markBoughtOrder.shade,
                qty: markBoughtOrder.qty,
                buyerName,
              }
            : null
        }
        open={markBoughtOpen}
        onOpenChange={(open) => {
          setMarkBoughtOpen(open)
          if (!open) setMarkBoughtOrder(null)
        }}
        onSuccess={() => {
          setMarkBoughtOpen(false)
          setMarkBoughtOrder(null)
          onOrdersChanged()
        }}
      />

      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order for {deleteOrder?.productName ?? "this item"}. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
