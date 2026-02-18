import { notFound } from "next/navigation"

import ShipmentDetailClient from "@/components/shared/ShipmentDetailClient"
import { prisma } from "@/lib/db"

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      status: true,
      departureDate: true,
      arrivalDate: true,
      orders: {
        select: {
          id: true,
          productName: true,
          status: true,
          sellPriceBdt: true,
          buyer: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!shipment) notFound()

  const purchasableOrders = await prisma.order.findMany({
    where: {
      status: "PURCHASED",
      batchId: null,
    },
    select: {
      id: true,
      productName: true,
      status: true,
      sellPriceBdt: true,
      buyer: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return <ShipmentDetailClient shipment={shipment} purchasableOrders={purchasableOrders} />
}
