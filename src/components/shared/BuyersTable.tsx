"use client"

import Fuse from "fuse.js"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import BuyerDrawer, { type BuyerData } from "@/components/shared/BuyerDrawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type BuyersTableProps = {
  buyers: BuyerData[]
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function BuyersTable({ buyers }: BuyersTableProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fuse = useMemo(
    () =>
      new Fuse(buyers, {
        keys: ["name", "phone"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [buyers]
  )

  const filteredBuyers = useMemo(() => {
    const term = query.trim()
    if (!term) return buyers
    return fuse.search(term).map((result) => result.item)
  }, [buyers, fuse, query])

  const handleDelete = useCallback(async (buyer: BuyerData) => {
    setDeletingId(buyer.id)
    try {
      const res = await fetch(`/api/buyers/${buyer.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to delete buyer.")
        return
      }
      toast.success("Buyer deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete buyer.")
    } finally {
      setDeletingId(null)
    }
  }, [router])

  const columns = useMemo<ColumnDef<BuyerData>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link href={`/buyers/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "-",
      },
      {
        id: "totalOrders",
        header: "Total Orders",
        cell: ({ row }) => row.original._count?.orders ?? 0,
      },
      {
        id: "outstandingBalance",
        header: "Outstanding Balance (BDT)",
        cell: ({ row }) => {
          const outstanding = row.original.outstandingBalance ?? 0
          return (
            <span className={cn(outstanding > 0 ? "text-red-600" : "text-[#8B6F74]")}>
              {formatBdt(outstanding)}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <BuyerDrawer
              mode="edit"
              buyer={row.original}
              trigger={
                <Button type="button" variant="outline" size="sm">
                  Edit
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete(row.original)}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        ),
      },
    ],
    [deletingId, handleDelete]
  )

  const table = useReactTable({
    data: filteredBuyers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 20,
      },
    },
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search buyers by name or phone..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          table.setPageIndex(0)
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[#8B6F74]">
                  No buyers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <span className="text-sm text-[#8B6F74]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
