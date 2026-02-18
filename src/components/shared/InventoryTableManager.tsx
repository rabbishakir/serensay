"use client"

import { Download } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import InventoryDrawer, {
  type BdInventoryItem,
  type InventoryType,
  type UsaInventoryItem,
} from "@/components/shared/InventoryDrawer"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type InventoryItem = BdInventoryItem | UsaInventoryItem

type InventoryTableManagerProps = {
  type: InventoryType
  initialItems: InventoryItem[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCurrency(value: number | null | undefined, currency: "BDT" | "USD") {
  if (value == null) return "-"
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function InventoryTableManager({ type, initialItems }: InventoryTableManagerProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [qtyEditingId, setQtyEditingId] = useState<string | null>(null)
  const [qtyDraft, setQtyDraft] = useState("")
  const [moveDialogItem, setMoveDialogItem] = useState<UsaInventoryItem | null>(null)
  const [moveQty, setMoveQty] = useState("1")
  const [movingToBd, setMovingToBd] = useState(false)

  const endpoint = `/api/inventory/${type}`

  const refreshItems = async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data?.error ?? "Failed to refresh inventory.")
        return
      }
      const data = (await res.json()) as InventoryItem[]
      setItems(data)
    } catch {
      toast.error("Failed to refresh inventory.")
    }
  }

  const saveQty = async (id: string, qtyRaw: string) => {
    const qty = Number(qtyRaw)
    if (!Number.isInteger(qty) || qty < 0) {
      toast.error("Qty must be a non-negative integer.")
      return
    }

    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to update qty.")
        return
      }
      setItems((prev) => prev.map((item) => (item.id === id ? (data as InventoryItem) : item)))
      setQtyEditingId(null)
      setQtyDraft("")
      toast.success("Qty updated")
    } catch {
      toast.error("Failed to update qty.")
    }
  }

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this item?")) return
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to delete item.")
        return
      }
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success("Item deleted")
    } catch {
      toast.error("Failed to delete item.")
    }
  }

  const onExport = () => {
    const rows =
      type === "bd"
        ? (items as BdInventoryItem[]).map((item) => ({
            Product: item.productName,
            Brand: item.brand ?? "",
            Shade: item.shade ?? "",
            Tags: item.tags.join(", "),
            Qty: item.qty,
            BuyPriceBDT: item.buyPriceBdt ?? "",
            SellPriceBDT: item.sellPriceBdt ?? "",
            UpdatedAt: formatDate(item.updatedAt),
          }))
        : (items as UsaInventoryItem[]).map((item) => ({
            Product: item.productName,
            Brand: item.brand ?? "",
            Shade: item.shade ?? "",
            Tags: item.tags.join(", "),
            Qty: item.qty,
            BuyPriceUSD: item.buyPriceUsd ?? "",
            WeightG: item.weightG ?? "",
            UpdatedAt: formatDate(item.updatedAt),
          }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, type === "bd" ? "BD Inventory" : "USA Inventory")
    XLSX.writeFile(wb, type === "bd" ? "bd-inventory.xlsx" : "usa-inventory.xlsx")
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.productName.localeCompare(b.productName)),
    [items]
  )

  const onMoveToBd = async () => {
    if (!moveDialogItem) return
    const qty = Number(moveQty)
    if (!Number.isInteger(qty) || qty <= 0 || qty > moveDialogItem.qty) {
      toast.error("Enter a valid qty.")
      return
    }

    setMovingToBd(true)
    try {
      const res = await fetch(`/api/inventory/usa/${moveDialogItem.id}/move-to-bd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to move to BD inventory.")
        return
      }
      toast.success(`Moved ${qty} units to BD inventory`)
      setMoveDialogItem(null)
      setMoveQty("1")
      await refreshItems()
    } catch {
      toast.error("Failed to move to BD inventory.")
    } finally {
      setMovingToBd(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
        <InventoryDrawer
          type={type}
          mode="add"
          trigger={<Button>+ Add Item</Button>}
          onSaved={(saved) => setItems((prev) => [saved, ...prev])}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Shade</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Qty</TableHead>
              {type === "bd" ? (
                <>
                  <TableHead>Buy Price (BDT)</TableHead>
                  <TableHead>Sell Price (BDT)</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Buy Price (USD)</TableHead>
                  <TableHead>Weight (g)</TableHead>
                </>
              )}
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-slate-500"
                >
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((item) => {
                const lowStock = item.qty < 2
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.brand || "-"}</TableCell>
                    <TableCell>{item.shade || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge key={`${item.id}-${tag}`} className="bg-blue-600 text-white">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {qtyEditingId === item.id ? (
                        <Input
                          autoFocus
                          type="number"
                          value={qtyDraft}
                          onChange={(e) => setQtyDraft(e.target.value)}
                          onBlur={() => void saveQty(item.id, qtyDraft)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void saveQty(item.id, qtyDraft)
                            }
                            if (e.key === "Escape") {
                              setQtyEditingId(null)
                              setQtyDraft("")
                            }
                          }}
                          className="h-8 w-20"
                        />
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-100"
                          onClick={() => {
                            setQtyEditingId(item.id)
                            setQtyDraft(String(item.qty))
                          }}
                        >
                          <span>{item.qty}</span>
                          {lowStock ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
                        </button>
                      )}
                    </TableCell>
                    {type === "bd" ? (
                      <>
                        <TableCell>
                          {formatCurrency((item as BdInventoryItem).buyPriceBdt, "BDT")}
                        </TableCell>
                        <TableCell>
                          {formatCurrency((item as BdInventoryItem).sellPriceBdt, "BDT")}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          {formatCurrency((item as UsaInventoryItem).buyPriceUsd, "USD")}
                        </TableCell>
                        <TableCell>{(item as UsaInventoryItem).weightG ?? "-"}</TableCell>
                      </>
                    )}
                    <TableCell>{formatDate(item.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {type === "usa" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const usaItem = item as UsaInventoryItem
                              setMoveDialogItem(usaItem)
                              setMoveQty(String(usaItem.qty))
                            }}
                          >
                            Move to BD
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void onDelete(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editingItem ? (
        <InventoryDrawer
          type={type}
          mode="edit"
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(next) => {
            if (!next) setEditingItem(null)
          }}
          onSaved={(saved) => {
            setItems((prev) =>
              prev.map((item) => (item.id === saved.id ? (saved as InventoryItem) : item))
            )
            setEditingItem(null)
          }}
        />
      ) : null}

      <Dialog
        open={!!moveDialogItem}
        onOpenChange={(open) => {
          if (!open) {
            setMoveDialogItem(null)
            setMoveQty("1")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to BD Inventory</DialogTitle>
            <DialogDescription>
              How many units do you want to move to BD stock?
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={moveDialogItem?.qty ?? 1}
            value={moveQty}
            onChange={(e) => setMoveQty(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveDialogItem(null)
                setMoveQty("1")
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void onMoveToBd()} disabled={movingToBd}>
              {movingToBd ? "Moving..." : "Move to BD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
