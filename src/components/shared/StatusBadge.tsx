import type { OrderStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"

type StatusStyle = {
  label: string
  className: string
}

const statusStyles: Record<OrderStatus, StatusStyle> = {
  TO_BE_PURCHASED: {
    label: "To Be Purchased",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PURCHASED: {
    label: "Purchased",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  IN_TRANSIT: {
    label: "In Transit",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  IN_BANGLADESH: {
    label: "In Bangladesh",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  DELIVERED: {
    label: "Delivered",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  RETURNED: {
    label: "Returned",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const style = statusStyles[status]
  return <Badge className={style.className}>{style.label}</Badge>
}
