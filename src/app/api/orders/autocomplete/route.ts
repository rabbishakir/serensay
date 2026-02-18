import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const field = req.nextUrl.searchParams.get("field")

  if (field !== "productName" && field !== "brand") {
    return NextResponse.json(
      { error: "Invalid field. Use productName or brand." },
      { status: 400 }
    )
  }

  try {
    const rows =
      field === "productName"
        ? await prisma.$queryRaw<{ value: string }[]>(
            Prisma.sql`
              SELECT "productName" AS value
              FROM "orders"
              WHERE "productName" IS NOT NULL AND "productName" <> ''
              GROUP BY "productName"
              ORDER BY COUNT(*) DESC
              LIMIT 20
            `
          )
        : await prisma.$queryRaw<{ value: string }[]>(
            Prisma.sql`
              SELECT "brand" AS value
              FROM "orders"
              WHERE "brand" IS NOT NULL AND "brand" <> ''
              GROUP BY "brand"
              ORDER BY COUNT(*) DESC
              LIMIT 20
            `
          )

    return NextResponse.json({ values: rows.map((row) => row.value) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch autocomplete values."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
