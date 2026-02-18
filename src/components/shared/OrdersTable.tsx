"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import OrderDrawer, { type OrderData } from "@/components/shared/OrderDrawer"
import MarkBoughtDialog from "@/components/shared/MarkBoughtDialog"
import StatusBadge from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type OrdersTableProps = {
  orders: OrderData[]
  refetchOrders?: () => void | Promise<void>
}

function formatDate(value: string) {
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

function sourceBadgeClass(source: OrderData["source"]) {
  switch (source) {
    case "BD_STOCK":
      return "border border-[#E8C8CC] bg-[#FCEEF0] text-[#A86870]"
    case "USA_STOCK":
      return "border border-[#EDE0E2] bg-white text-[#5D4548]"
    default:
      return "border border-[#EDE0E2] bg-[#F9F5F6] text-[#5D4548]"
  }
}

function sourceLabel(source: OrderData["source"]) {
  switch (source) {
    case "BD_STOCK":
      return "BD Stock"
    case "USA_STOCK":
      return "USA Stock"
    default:
      return "Pre-Order"
  }
}

export default function OrdersTable({ orders, refetchOrders }: OrdersTableProps) {
  const router = useRouter()
  const [rows, setRows] = useState<OrderData[]>(orders)
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null)
  const [buyingOrder, setBuyingOrder] = useState<OrderData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setRows(orders)
  }, [orders])

  const onSaved = (saved: OrderData) => {
    setRows((prev) => {
      const exists = prev.some((row) => row.id === saved.id)
      if (!exists) return prev
      return prev.map((row) => (row.id === saved.id ? { ...row, ...saved } : row))
    })
    setEditingOrder(null)
  }

  const onDelete = async (order: OrderData) => {
    const confirmed = window.confirm("Delete this order?")
    if (!confirmed) return

    setDeletingId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to delete order.")
        return
      }
      setRows((prev) => prev.filter((row) => row.id !== order.id))
      toast.success("Order deleted")
    } catch {
      toast.error("Failed to delete order.")
    } finally {
      setDeletingId(null)
    }
  }

  const columns = useMemo<ColumnDef<OrderData>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "buyer",
        header: "Buyer",
        cell: ({ row }) => (
          <Link
            href={`/buyers/${row.original.buyerId}`}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.buyer?.name ?? "Unknown buyer"}
          </Link>
        ),
      },
      {
        id: "productBrand",
        header: "Product + Brand",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.productName}</p>
            {row.original.brand ? (
              <p className="text-xs text-[#8B6F74]">{row.original.brand}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "qty",
        header: () => <span className="inline-block w-[60px]">Qty</span>,
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-block w-[60px]",
              row.original.qty > 1 ? "font-semibold text-[#C4878E]" : "text-[#8B6F74]"
            )}
          >
            {row.original.qty}
          </span>
        ),
      },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => (
          <Badge className={sourceBadgeClass(row.original.source)}>
            {sourceLabel(row.original.source)}
          </Badge>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "sellPrice",
        header: "Sell Price (BDT)",
        cell: ({ row }) => formatBdt(row.original.sellPriceBdt),
      },
      {
        id: "deposit",
        header: "Deposit (BDT)",
        cell: ({ row }) => formatBdt(row.original.depositBdt),
      },
      {
        id: "balanceDue",
        header: "Balance Due",
        cell: ({ row }) => {
          const balance = row.original.sellPriceBdt - row.original.depositBdt
          return (
            <span className={cn(balance > 0 ? "font-medium text-[#C4878E]" : "text-[#8B6F74]")}>
              {formatBdt(balance)}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={() => setEditingOrder(row.original)}>
              Edit
            </Button>
            {row.original.status === "TO_BE_PURCHASED" ? (
              <Button
                size="sm"
                variant="outline"
                className="border-[#E8C8CC] text-[#C4878E] hover:bg-[#FCEEF0]"
                onClick={() => setBuyingOrder(row.original)}
              >
                Mark Bought
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              disabled={deletingId === row.original.id}
              onClick={() => void onDelete(row.original)}
            >
              {deletingId === row.original.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        ),
      },
    ],
    [deletingId]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const balance = row.original.sellPriceBdt - row.original.depositBdt
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer",
                    row.original.status === "TO_BE_PURCHASED"
                      ? "border-l-2 border-l-[#C4878E]"
                      : balance > 0
                        ? "border-l-2 border-l-[#E8C8CC]"
                        : ""
                  )}
                  onClick={() => setEditingOrder(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-[#8B6F74]">
                No orders found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {editingOrder ? (
        <OrderDrawer
          mode="edit"
          order={editingOrder}
          open={!!editingOrder}
          onOpenChange={(next) => {
            if (!next) setEditingOrder(null)
          }}
          onSaved={onSaved}
        />
      ) : null}

      <MarkBoughtDialog
        order={
          buyingOrder
            ? {
                id: buyingOrder.id,
                productName: buyingOrder.productName,
                brand: buyingOrder.brand,
                shade: buyingOrder.shade,
                qty: buyingOrder.qty,
                buyerName: buyingOrder.buyer?.name ?? "Unknown buyer",
              }
            : null
        }
        open={buyingOrder !== null}
        onOpenChange={(open) => {
          if (!open) setBuyingOrder(null)
        }}
        onSuccess={() => {
          setBuyingOrder(null)
          if (refetchOrders) {
            void refetchOrders()
            return
          }
          router.refresh()
        }}
      />
    </div>
  )
}
