import type { OrderStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"

type StatusStyle = {
  label: string
  className: string
}

const statusStyles: Record<OrderStatus, StatusStyle> = {
  TO_BE_PURCHASED: {
    label: "To Buy",
    className: "rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-medium text-[#92400E]",
  },
  PURCHASED: {
    label: "Purchased",
    className: "rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-xs font-medium text-[#5B21B6]",
  },
  IN_TRANSIT: {
    label: "In Transit",
    className: "rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-xs font-medium text-[#1E40AF]",
  },
  IN_BANGLADESH: {
    label: "In BD",
    className: "rounded-full bg-[#E0F2FE] px-2.5 py-0.5 text-xs font-medium text-[#0369A1]",
  },
  DELIVERED: {
    label: "Delivered",
    className: "rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-medium text-[#166534]",
  },
  RETURNED: {
    label: "Returned",
    className: "rounded-full bg-[#FCE7F3] px-2.5 py-0.5 text-xs font-medium text-[#9D174D]",
  },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const style = statusStyles[status]
  return <Badge className={style.className}>{style.label}</Badge>
}
