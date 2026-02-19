"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import ShipmentManifestExport from "@/components/shared/ShipmentManifestExport"
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

type UsaInventoryItem = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  buyPriceUsd: number | null
  weightG: number | null
  tags: string[]
}

type BatchStockItem = {
  usaInventoryId: string
  productName: string
  brand: string | null
  shade: string | null
  qtyToShip: number
  buyPriceUsd: number | null
  weightG: number | null
  currentQty?: number
  tags?: string[]
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
      return "bg-[#FEF3C7] text-[#92400E]"
    case "IN_TRANSIT":
      return "bg-[#DBEAFE] text-[#1E40AF]"
    case "ARRIVED":
      return "bg-[#DCFCE7] text-[#166534]"
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

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

type StockSelection = {
  checked: boolean
  qtyToShip: number
}

export default function ShipmentDetailClient({ shipment, purchasableOrders }: ShipmentDetailClientProps) {
  const router = useRouter()
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTab, setAssignTab] = useState<"orders" | "stock">("orders")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [stockItems, setStockItems] = useState<BatchStockItem[]>([])
  const [usaItems, setUsaItems] = useState<UsaInventoryItem[]>([])
  const [usaSearch, setUsaSearch] = useState("")
  const [usaLoading, setUsaLoading] = useState(false)
  const [savingStock, setSavingStock] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Record<string, StockSelection>>({})

  const selectable = useMemo(
    () => purchasableOrders.filter((o) => !shipment.orders.some((assigned) => assigned.id === o.id)),
    [purchasableOrders, shipment.orders]
  )

  const filteredUsaItems = useMemo(() => {
    const term = usaSearch.trim().toLowerCase()
    if (!term) return usaItems
    return usaItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(term) ||
        (item.brand ?? "").toLowerCase().includes(term)
    )
  }, [usaItems, usaSearch])

  const stockSummary = useMemo(() => {
    const totalQty = stockItems.reduce((sum, item) => sum + item.qtyToShip, 0)
    const totalWeight = stockItems.reduce(
      (sum, item) => sum + item.qtyToShip * (item.weightG ?? 0),
      0
    )
    const totalValue = stockItems.reduce(
      (sum, item) => sum + item.qtyToShip * (item.buyPriceUsd ?? 0),
      0
    )
    return { totalQty, totalWeight, totalValue }
  }, [stockItems])

  const refresh = () => window.location.reload()

  const fetchBatchStockItems = async () => {
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/stock`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to load batch stock items.")
        return
      }
      setStockItems((data.stockItems ?? []) as BatchStockItem[])
    } catch {
      toast.error("Failed to load batch stock items.")
    }
  }

  useEffect(() => {
    void fetchBatchStockItems()
  }, [shipment.id])

  useEffect(() => {
    if (!assignOpen || assignTab !== "stock") return

    let cancelled = false
    const run = async () => {
      setUsaLoading(true)
      try {
        const res = await fetch("/api/inventory/usa", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok || cancelled) {
          if (!cancelled) toast.error(data?.error ?? "Failed to load USA inventory.")
          return
        }

        const rows = (data as UsaInventoryItem[]).filter((item) => item.qty > 0)
        if (cancelled) return
        setUsaItems(rows)

        const existingById = new Map(stockItems.map((item) => [item.usaInventoryId, item]))
        const nextSelection: Record<string, StockSelection> = {}
        for (const item of rows) {
          const existing = existingById.get(item.id)
          nextSelection[item.id] = {
            checked: !!existing,
            qtyToShip: existing?.qtyToShip ?? item.qty,
          }
        }
        setSelectedStock(nextSelection)
      } catch {
        if (!cancelled) toast.error("Failed to load USA inventory.")
      } finally {
        if (!cancelled) setUsaLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [assignOpen, assignTab, stockItems])

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    )
  }

  const toggleStockSelection = (item: UsaInventoryItem, checked: boolean) => {
    setSelectedStock((prev) => ({
      ...prev,
      [item.id]: {
        checked,
        qtyToShip: prev[item.id]?.qtyToShip ?? item.qty,
      },
    }))
  }

  const changeStockQty = (itemId: string, nextValue: string, maxQty: number) => {
    const parsed = Number(nextValue)
    const qtyToShip = Number.isFinite(parsed) ? Math.max(1, Math.min(maxQty, Math.floor(parsed))) : 1
    setSelectedStock((prev) => ({
      ...prev,
      [itemId]: {
        checked: prev[itemId]?.checked ?? false,
        qtyToShip,
      },
    }))
  }

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

  const saveStockItems = async () => {
    const payload = usaItems
      .filter((item) => selectedStock[item.id]?.checked)
      .map((item) => ({
        usaInventoryId: item.id,
        productName: item.productName,
        brand: item.brand,
        shade: item.shade,
        qtyToShip: selectedStock[item.id]?.qtyToShip ?? item.qty,
        buyPriceUsd: item.buyPriceUsd,
        weightG: item.weightG,
      }))

    for (const item of payload) {
      const usaItem = usaItems.find((row) => row.id === item.usaInventoryId)
      if (!usaItem) continue
      if (item.qtyToShip < 1 || item.qtyToShip > usaItem.qty) {
        toast.error(`Invalid qty for ${item.productName}.`)
        return
      }
    }

    setSavingStock(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockItems: payload }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save stock items.")
        return
      }
      toast.success("Stock items saved to batch")
      setAssignOpen(false)
      setAssignTab("orders")
      await fetchBatchStockItems()
      refresh()
    } catch {
      toast.error("Failed to save stock items.")
    } finally {
      setSavingStock(false)
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
      toast.success(
        `Batch arrived! ${data.ordersUpdated ?? 0} orders updated, ${data.stockItemsMoved ?? 0} stock items moved to BD inventory.`
      )
      refresh()
    } catch {
      toast.error("Failed to mark arrived.")
    } finally {
      setBusy(false)
    }
  }

  const deleteShipment = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to delete batch.")
        setDeleteOpen(false)
        return
      }
      toast.success("Batch deleted")
      router.push("/shipments")
    } catch {
      toast.error("Failed to delete batch.")
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">{shipment.name}</h1>
          <div className="flex items-center gap-2">
            <Badge className={shipmentBadgeClass(shipment.status)}>{shipment.status}</Badge>
          </div>
          <p className="text-sm text-[#8B6F74]">Departure: {formatDate(shipment.departureDate)}</p>
          <p className="text-sm text-[#8B6F74]">Arrival: {formatDate(shipment.arrivalDate)}</p>
        </div>

        <div className="flex gap-2">
          <ShipmentManifestExport shipmentId={shipment.id} shipmentName={shipment.name} />
          <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => setDeleteOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shipment Batch?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &apos;{shipment.name}&apos;? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <Button variant="destructive" disabled={deleting} onClick={() => void deleteShipment()}>
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {shipment.status === "PACKING" ? (
            <>
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setAssignTab("orders")}>
                    Assign Orders
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Assign Items to Shipment</DialogTitle>
                    <DialogDescription>
                      Add purchased orders and optional USA stock to this batch.
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs
                    value={assignTab}
                    onValueChange={(value) => setAssignTab(value as "orders" | "stock")}
                    className="space-y-3"
                  >
                    <TabsList>
                      <TabsTrigger value="orders">Orders</TabsTrigger>
                      <TabsTrigger value="stock">USA Stock</TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders" className="space-y-3">
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
                                <TableCell colSpan={4} className="h-20 text-center text-[#8B6F74]">
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
                    </TabsContent>

                    <TabsContent value="stock" className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Select USA inventory items to include in this shipment</p>
                        <p className="text-xs text-[#8B6F74]">
                          These will automatically move to BD Inventory when the batch is marked Arrived.
                        </p>
                      </div>

                      <Input
                        value={usaSearch}
                        onChange={(e) => setUsaSearch(e.target.value)}
                        placeholder="Search USA inventory by product or brand..."
                      />

                      <div className="max-h-[360px] overflow-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead />
                              <TableHead>Product</TableHead>
                              <TableHead>Brand</TableHead>
                              <TableHead>Shade</TableHead>
                              <TableHead>Available Qty</TableHead>
                              <TableHead>Buy Price (USD)</TableHead>
                              <TableHead>Weight (g)</TableHead>
                              <TableHead>Qty to Ship</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usaLoading ? (
                              <TableRow>
                                <TableCell colSpan={8} className="h-20 text-center text-[#8B6F74]">
                                  Loading USA inventory...
                                </TableCell>
                              </TableRow>
                            ) : filteredUsaItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="h-20 text-center text-[#8B6F74]">
                                  No items in USA Inventory. Add items in USA Inventory first.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredUsaItems.map((item) => {
                                const checked = selectedStock[item.id]?.checked ?? false
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(next) =>
                                          toggleStockSelection(item, next === true)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell>{item.brand || "-"}</TableCell>
                                    <TableCell>{item.shade || "-"}</TableCell>
                                    <TableCell>{item.qty}</TableCell>
                                    <TableCell>{item.buyPriceUsd == null ? "-" : formatUsd(item.buyPriceUsd)}</TableCell>
                                    <TableCell>{item.weightG == null ? "-" : item.weightG}</TableCell>
                                    <TableCell>
                                      {checked ? (
                                        <Input
                                          type="number"
                                          min={1}
                                          max={item.qty}
                                          value={selectedStock[item.id]?.qtyToShip ?? item.qty}
                                          onChange={(e) => changeStockQty(item.id, e.target.value, item.qty)}
                                          className="h-8 w-24"
                                        />
                                      ) : (
                                        <span className="text-xs text-[#8B6F74]">-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignOpen(false)}>
                          Cancel
                        </Button>
                        <Button disabled={savingStock} onClick={() => void saveStockItems()}>
                          {savingStock ? "Saving..." : "Save Stock Items"}
                        </Button>
                      </DialogFooter>
                    </TabsContent>
                  </Tabs>
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
                <TableCell colSpan={4} className="h-20 text-center text-[#8B6F74]">
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1E1215]">USA Stock in This Batch</h2>
          {shipment.status === "PACKING" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAssignTab("stock")
                setAssignOpen(true)
              }}
            >
              Edit Stock Items
            </Button>
          ) : null}
        </div>

        {shipment.status !== "PACKING" ? (
          <p className="text-xs text-[#8B6F74]">
            These items will move to BD Inventory when this batch is marked Arrived.
          </p>
        ) : null}

        {stockItems.length === 0 ? (
          <p className="text-sm text-[#8B6F74]">
            No stock items added. Use &quot;Assign Orders&quot; -&gt; USA Stock tab to add items.
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Shade</TableHead>
                    <TableHead>Qty to Ship</TableHead>
                    <TableHead>Buy Price (USD)</TableHead>
                    <TableHead>Weight (g)</TableHead>
                    <TableHead>Total Weight</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item, idx) => (
                    <TableRow key={`${item.usaInventoryId}-${idx}`}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{item.shade || "-"}</TableCell>
                      <TableCell>{item.qtyToShip}</TableCell>
                      <TableCell>{item.buyPriceUsd == null ? "-" : formatUsd(item.buyPriceUsd)}</TableCell>
                      <TableCell>{item.weightG == null ? "-" : item.weightG}</TableCell>
                      <TableCell>{item.qtyToShip * (item.weightG ?? 0)}</TableCell>
                      <TableCell>{(item.tags ?? []).length ? (item.tags ?? []).join(", ") : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-[#5D4548]">
              Total: {stockSummary.totalQty} items | {stockSummary.totalWeight}g |{" "}
              {formatUsd(stockSummary.totalValue)} USD
            </p>
          </>
        )}
      </section>
    </div>
  )
}
