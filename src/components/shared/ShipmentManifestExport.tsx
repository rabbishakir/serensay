"use client"

import * as XLSX from "xlsx"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ShipmentManifestExportProps = {
  shipmentId: string
  shipmentName: string
}

type ShipmentOrder = {
  id: string
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  buyPriceUsd: number | null
  sellPriceBdt: number
  depositBdt: number
  status: string
  buyer: { name: string }
}

type ShipmentDetailResponse = {
  id: string
  name: string
  departureDate: string | null
  orders: ShipmentOrder[]
}

type ShipmentStockItem = {
  usaInventoryId: string
  productName: string
  brand: string | null
  shade: string | null
  qtyToShip: number
  buyPriceUsd: number | null
  weightG: number | null
  tags?: string[]
}

type ShipmentStockResponse = {
  stockItems: ShipmentStockItem[]
}

function formatDate(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function numberOrZero(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }))
}

function setBoldRow(ws: XLSX.WorkSheet, rowIndex: number, colCount: number) {
  for (let col = 0; col < colCount; col += 1) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: col })
    if (!ws[address]) continue
    ;(ws[address] as XLSX.CellObject & { s?: Record<string, unknown> }).s = {
      ...(ws[address] as XLSX.CellObject & { s?: Record<string, unknown> }).s,
      font: { bold: true },
    }
  }
}

function setFillRow(ws: XLSX.WorkSheet, rowIndex: number, colCount: number, rgb: string) {
  for (let col = 0; col < colCount; col += 1) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: col })
    if (!ws[address]) continue
    ;(ws[address] as XLSX.CellObject & { s?: Record<string, unknown> }).s = {
      ...(ws[address] as XLSX.CellObject & { s?: Record<string, unknown> }).s,
      fill: { fgColor: { rgb } },
    }
  }
}

function applyNumberFormat(ws: XLSX.WorkSheet, rowIndex: number, cols: number[]) {
  for (const col of cols) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: col })
    if (!ws[address]) continue
    ;(ws[address] as XLSX.CellObject).z = "0.00"
  }
}

export default function ShipmentManifestExport({
  shipmentId,
  shipmentName,
}: ShipmentManifestExportProps) {
  const exportManifest = async () => {
    try {
      const [shipmentRes, stockRes] = await Promise.all([
        fetch(`/api/shipments/${shipmentId}`, { cache: "no-store" }),
        fetch(`/api/shipments/${shipmentId}/stock`, { cache: "no-store" }),
      ])

      const shipmentData = shipmentRes.ok
        ? ((await shipmentRes.json()) as ShipmentDetailResponse)
        : null
      const stockData = stockRes.ok
        ? ((await stockRes.json()) as ShipmentStockResponse)
        : { stockItems: [] }

      if (!shipmentData) {
        toast.error("Failed to load shipment data for export.")
        return
      }

      const stockItems = stockData.stockItems ?? []
      const orders = shipmentData.orders ?? []

      const fullRows: Array<Array<string | number>> = [
        ["SERENE SAY - Shipment Manifest"],
        [`${shipmentName} | Departure: ${formatDate(shipmentData.departureDate)}`],
        [],
        [
          "Type",
          "Buyer",
          "Product",
          "Brand",
          "Shade",
          "Qty",
          "Buy Price (USD)",
          "Weight/unit (g)",
          "Total Weight (g)",
          "Sell Price (BDT)",
          "Deposit (BDT)",
          "Balance Due (BDT)",
          "Status",
        ],
      ]

      for (const order of orders) {
        const qty = numberOrZero(order.qty)
        const sell = numberOrZero(order.sellPriceBdt)
        const deposit = numberOrZero(order.depositBdt)
        fullRows.push([
          "Order",
          order.buyer?.name ?? "",
          order.productName ?? "",
          order.brand ?? "",
          order.shade ?? "",
          qty,
          numberOrZero(order.buyPriceUsd),
          "",
          "",
          sell,
          deposit,
          sell - deposit,
          order.status,
        ])
      }

      const firstStockRowIndex = fullRows.length
      for (const stock of stockItems) {
        const qty = numberOrZero(stock.qtyToShip)
        const weight = numberOrZero(stock.weightG)
        fullRows.push([
          "USA Stock",
          "-- BD Stock",
          stock.productName ?? "",
          stock.brand ?? "",
          stock.shade ?? "",
          qty,
          numberOrZero(stock.buyPriceUsd),
          weight,
          qty * weight,
          "",
          "",
          "",
          "Moving to BD",
        ])
      }

      const totalOrderQty = orders.reduce((sum, order) => sum + numberOrZero(order.qty), 0)
      const totalStockQty = stockItems.reduce((sum, item) => sum + numberOrZero(item.qtyToShip), 0)
      const totalQty = totalOrderQty + totalStockQty
      const totalWeight = stockItems.reduce(
        (sum, item) => sum + numberOrZero(item.qtyToShip) * numberOrZero(item.weightG),
        0
      )
      const totalUsd = stockItems.reduce(
        (sum, item) => sum + numberOrZero(item.qtyToShip) * numberOrZero(item.buyPriceUsd),
        0
      )

      fullRows.push([])
      fullRows.push(["Total Orders:", orders.length])
      fullRows.push(["Total Stock Lines:", stockItems.length])
      fullRows.push(["Total Qty:", totalQty])
      fullRows.push(["Total Weight:", totalWeight])
      fullRows.push(["Total USD Value:", totalUsd])

      const wsFull = XLSX.utils.aoa_to_sheet(fullRows)
      setColWidths(wsFull, [12, 24, 34, 20, 16, 8, 14, 16, 16, 16, 14, 18, 16])
      setBoldRow(wsFull, 0, 13)
      setBoldRow(wsFull, 3, 13)
      if (stockItems.length > 0) {
        for (let i = 0; i < stockItems.length; i += 1) {
          setFillRow(wsFull, firstStockRowIndex + i, 13, "FFF5F5")
        }
      }
      setBoldRow(wsFull, fullRows.length - 5, 2)
      setBoldRow(wsFull, fullRows.length - 4, 2)
      setBoldRow(wsFull, fullRows.length - 3, 2)
      setBoldRow(wsFull, fullRows.length - 2, 2)
      setBoldRow(wsFull, fullRows.length - 1, 2)

      for (let row = 4; row < fullRows.length; row += 1) {
        applyNumberFormat(wsFull, row, [6, 7, 8, 9, 10, 11])
      }

      const orderRows = orders.map((order) => {
        const qty = numberOrZero(order.qty)
        const sell = numberOrZero(order.sellPriceBdt)
        const deposit = numberOrZero(order.depositBdt)
        return {
          Buyer: order.buyer?.name ?? "",
          Product: order.productName ?? "",
          Brand: order.brand ?? "",
          Shade: order.shade ?? "",
          Qty: qty,
          "Buy Price (USD)": numberOrZero(order.buyPriceUsd),
          "Weight/unit (g)": "",
          "Total Weight (g)": "",
          "Sell Price (BDT)": sell,
          "Deposit (BDT)": deposit,
          "Balance Due (BDT)": sell - deposit,
          Status: order.status,
        }
      })
      const wsOrders = XLSX.utils.json_to_sheet(orderRows)
      setColWidths(wsOrders, [24, 34, 20, 16, 8, 14, 16, 16, 16, 14, 18, 16])
      setBoldRow(wsOrders, 0, 12)

      const stockRows = stockItems.map((stock) => {
        const qty = numberOrZero(stock.qtyToShip)
        const weight = numberOrZero(stock.weightG)
        return {
          Product: stock.productName ?? "",
          Brand: stock.brand ?? "",
          Shade: stock.shade ?? "",
          "Qty to Ship": qty,
          "Buy Price (USD)": numberOrZero(stock.buyPriceUsd),
          "Weight/unit (g)": weight,
          "Total Weight (g)": qty * weight,
          Tags: Array.isArray(stock.tags) ? stock.tags.join(", ") : "",
        }
      })
      const wsStock = XLSX.utils.json_to_sheet(stockRows)
      setColWidths(wsStock, [34, 20, 16, 12, 14, 16, 16, 24])
      setBoldRow(wsStock, 0, 8)

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, wsFull, "Full Manifest")
      XLSX.utils.book_append_sheet(wb, wsOrders, "Orders Only")
      XLSX.utils.book_append_sheet(wb, wsStock, "Stock Items Only")

      const safeName = shipmentName.trim().replace(/\s+/g, "_")
      XLSX.writeFile(wb, `SerenesSay_${safeName}_Manifest.xlsx`)
      toast.success("Manifest exported")
    } catch {
      toast.error("Failed to export manifest.")
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void exportManifest()}>
      📥 Export Manifest
    </Button>
  )
}
