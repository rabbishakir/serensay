"use client"

import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type OrdersByStatus = {
  TO_BE_PURCHASED: number
  PURCHASED: number
  IN_TRANSIT: number
  IN_BANGLADESH: number
  DELIVERED: number
  RETURNED: number
}

type MonthlyReport = {
  month: string
  totalOrders: number
  totalSalesBdt: number
  totalPurchasesUsd: number
  totalPurchasesBdt: number
  totalDepositsCollected: number
  outstandingBalance: number
  grossProfitBdt: number
  marginPct: number
  ordersByStatus: OrdersByStatus
  topProducts: Array<{ productName: string; count: number }>
  ordersTable: Array<{
    id: string
    buyerName: string
    product: string
    brand: string | null
    sell: number
    buy: number | null
    deposit: number
    status: string
  }>
}

function currentMonthLabel() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, (m - 1) + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function displayMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
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

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonthLabel())
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [exchangeRate, setExchangeRate] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const [reportRes, settingsRes] = await Promise.all([
          fetch(`/api/reports/monthly?month=${encodeURIComponent(month)}`, { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ])

        if (!reportRes.ok) {
          if (!cancelled) setReport(null)
          return
        }

        const reportData = (await reportRes.json()) as MonthlyReport
        const settings = settingsRes.ok
          ? ((await settingsRes.json()) as Record<string, string>)
          : {}

        if (!cancelled) {
          setReport(reportData)
          setExchangeRate(Number(settings.exchange_rate ?? "0") || 0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [month])

  const statusChartData = useMemo(() => {
    if (!report) return []
    return Object.entries(report.ordersByStatus).map(([status, count]) => ({
      status,
      count,
    }))
  }, [report])

  const totalSalesEstimatedUsd = useMemo(() => {
    if (!report || exchangeRate <= 0) return 0
    return report.totalSalesBdt / exchangeRate
  }, [report, exchangeRate])

  const exportExcel = () => {
    if (!report) return
    const wb = XLSX.utils.book_new()

    const summaryRows = [
      { Metric: "Month", Value: report.month },
      { Metric: "Total Orders", Value: report.totalOrders },
      { Metric: "Total Sales (BDT)", Value: report.totalSalesBdt },
      { Metric: "Total Purchases (USD)", Value: report.totalPurchasesUsd },
      { Metric: "Total Purchases (BDT)", Value: report.totalPurchasesBdt },
      { Metric: "Total Deposits Collected", Value: report.totalDepositsCollected },
      { Metric: "Outstanding Balance", Value: report.outstandingBalance },
      { Metric: "Gross Profit (BDT)", Value: report.grossProfitBdt },
      { Metric: "Margin %", Value: Number(report.marginPct.toFixed(2)) },
      { Metric: "Total Sales Estimated (USD)", Value: Number(totalSalesEstimatedUsd.toFixed(2)) },
    ]

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    const wsOrders = XLSX.utils.json_to_sheet(report.ordersTable)

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")
    XLSX.utils.book_append_sheet(wb, wsOrders, "Orders")
    XLSX.writeFile(wb, `GlamOrbit_Report_${report.month}.xlsx`)
  }

  if (loading || !report) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{displayMonth(month)}</h1>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={exportExcel}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Sales (BDT)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBdt(report.totalSalesBdt)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Purchases (BDT)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBdt(report.totalPurchasesBdt)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gross Profit (BDT)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBdt(report.grossProfitBdt)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Margin %</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{report.marginPct.toFixed(2)}%</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{report.totalOrders}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deposits Collected</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatBdt(report.totalDepositsCollected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBdt(report.outstandingBalance)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Purchases (USD)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatUsd(report.totalPurchasesUsd)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Sales Estimated (USD)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatUsd(totalSalesEstimatedUsd)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Products</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Rank</th>
                <th className="py-2">Product</th>
                <th className="py-2">Orders</th>
              </tr>
            </thead>
            <tbody>
              {report.topProducts.map((row, idx) => (
                <tr key={row.productName} className="border-b last:border-0">
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2">{row.productName}</td>
                  <td className="py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
