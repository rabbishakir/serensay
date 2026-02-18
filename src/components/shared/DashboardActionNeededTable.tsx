"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { OrderStatus } from "@prisma/client"

import MarkBoughtDialog from "@/components/shared/MarkBoughtDialog"
import StatusBadge from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"

type ActionNeededOrder = {
  id: string
  productName: string
  shade: string | null
  qty: number
  status: OrderStatus
  sellPriceBdt: number
  depositBdt: number
  buyer: { name: string }
}

type DashboardActionNeededTableProps = {
  orders: ActionNeededOrder[]
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DashboardActionNeededTable({
  orders,
}: DashboardActionNeededTableProps) {
  const router = useRouter()
  const [buyingOrder, setBuyingOrder] = useState<ActionNeededOrder | null>(null)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="px-2 py-2 font-medium">Buyer</th>
              <th className="px-2 py-2 font-medium">Product</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Balance Due</th>
              <th className="px-2 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                  No action-needed orders.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const balanceDue = order.sellPriceBdt - order.depositBdt
                return (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="px-2 py-3">{order.buyer.name}</td>
                    <td className="px-2 py-3">{order.productName}</td>
                    <td className="px-2 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-2 py-3 font-medium">{formatBdt(balanceDue)}</td>
                    <td className="px-2 py-3 text-right">
                      {order.status === "TO_BE_PURCHASED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => setBuyingOrder(order)}
                        >
                          Mark Bought
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <MarkBoughtDialog
        order={
          buyingOrder
            ? {
                id: buyingOrder.id,
                productName: buyingOrder.productName,
                brand: null,
                shade: buyingOrder.shade,
                qty: buyingOrder.qty,
                buyerName: buyingOrder.buyer.name,
              }
            : null
        }
        open={buyingOrder !== null}
        onOpenChange={(open) => {
          if (!open) setBuyingOrder(null)
        }}
        onSuccess={() => {
          setBuyingOrder(null)
          router.refresh()
        }}
      />
    </>
  )
}
