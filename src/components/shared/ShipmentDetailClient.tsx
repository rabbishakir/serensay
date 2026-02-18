"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import StatusBadge from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ShipmentOrder = {
  id: string
  productName: string
  status: "TO_BE_PURCHASED" | "PURCHASED" | "IN_TRANSIT" | "IN_BANGLADESH" | "DELIVERED" | "RETURNED"
  sellPriceBdt: number
  buyer: { name: string }
}

type PurchasableOrder = {
  id: string
  productName: string
  status: "TO_BE_PURCHASED" | "PURCHASED" | "IN_TRANSIT" | "IN_BANGLADESH" | "DELIVERED" | "RETURNED"
  sellPriceBdt: number
  buyer: { name: string }
}

type ShipmentDetailClientProps = {
  shipment: {
    id: string
    name: string
    status: "PACKING" | "IN_TRANSIT" | "ARRIVED"
    departureDate: Date | null
    arrivalDate: Date | null
    orders: ShipmentOrder[]
  }
  purchasableOrders: PurchasableOrder[]
}

function shipmentBadgeClass(status: "PACKING" | "IN_TRANSIT" | "ARRIVED") {
  switch (status) {
    case "PACKING":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "ARRIVED":
      return "bg-green-100 text-green-800 border-green-200"
  }
}

function formatDate(value: Date | string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ShipmentDetailClient({ shipment, purchasableOrders }: ShipmentDetailClientProps) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const selectable = useMemo(
    () => purchasableOrders.filter((o) => !shipment.orders.some((assigned) => assigned.id === o.id)),
    [purchasableOrders, shipment.orders]
  )

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    )
  }

  const refresh = () => window.location.reload()

  const assignSelected = async () => {
    if (selectedIds.length === 0) return
    setBusy(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to assign orders.")
        return
      }
      toast.success(`Assigned ${data.assigned} order(s)`)
      setAssignOpen(false)
      setSelectedIds([])
      refresh()
    } catch {
      toast.error("Failed to assign orders.")
    } finally {
      setBusy(false)
    }
  }

  const markDispatched = async () => {
    if (!window.confirm("Mark this shipment as dispatched?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/dispatch`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to mark dispatched.")
        return
      }
      toast.success("Shipment marked in transit")
      refresh()
    } catch {
      toast.error("Failed to mark dispatched.")
    } finally {
      setBusy(false)
    }
  }

  const markArrived = async () => {
    if (!window.confirm("Mark this shipment as arrived?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/arrive`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to mark arrived.")
        return
      }
      toast.success("Shipment marked arrived")
      refresh()
    } catch {
      toast.error("Failed to mark arrived.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{shipment.name}</h1>
          <div className="flex items-center gap-2">
            <Badge className={shipmentBadgeClass(shipment.status)}>{shipment.status}</Badge>
          </div>
          <p className="text-sm text-slate-600">Departure: {formatDate(shipment.departureDate)}</p>
          <p className="text-sm text-slate-600">Arrival: {formatDate(shipment.arrivalDate)}</p>
        </div>

        <div className="flex gap-2">
          {shipment.status === "PACKING" ? (
            <>
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Assign Orders</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Assign Purchased Orders</DialogTitle>
                    <DialogDescription>Select orders to assign to this shipment.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[360px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead />
                          <TableHead>Product</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectable.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-20 text-center text-slate-500">
                              No eligible orders.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectable.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.includes(order.id)}
                                  onCheckedChange={(checked) =>
                                    toggleSelection(order.id, checked === true)
                                  }
                                />
                              </TableCell>
                              <TableCell>{order.productName}</TableCell>
                              <TableCell>{order.buyer.name}</TableCell>
                              <TableCell>
                                <StatusBadge status={order.status} />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAssignOpen(false)}>
                      Cancel
                    </Button>
                    <Button disabled={busy || selectedIds.length === 0} onClick={() => void assignSelected()}>
                      Assign Selected
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button disabled={busy} onClick={() => void markDispatched()}>
                Mark Dispatched
              </Button>
            </>
          ) : null}

          {shipment.status === "IN_TRANSIT" ? (
            <Button disabled={busy} onClick={() => void markArrived()}>
              Mark Arrived
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sell Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipment.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-slate-500">
                  No orders assigned to this shipment.
                </TableCell>
              </TableRow>
            ) : (
              shipment.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.productName}</TableCell>
                  <TableCell>{order.buyer.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{formatBdt(order.sellPriceBdt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
