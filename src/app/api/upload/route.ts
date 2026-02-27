import fs from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await getSession(request)
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorised" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 })
    }

    const timestamp = Date.now()
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const sanitizedBase = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase() || "upload"
    const safeName = sanitizedBase.includes(".") ? sanitizedBase : `${sanitizedBase}.${ext}`
    const filename = `${timestamp}_${safeName}`

    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
      : path.join(process.cwd(), "uploads", "inventory")
    fs.mkdirSync(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = path.join(uploadDir, filename)
    fs.writeFileSync(filepath, buffer)

    // Hostinger production: set UPLOAD_DIR to an absolute writable path outside the Next.js build,
    // e.g. /home/u123456789/domains/thebaymart.com/public_html/uploads/inventory and
    // UPLOAD_URL_PREFIX=https://thebaymart.com/uploads/inventory
    const urlPrefix = process.env.UPLOAD_URL_PREFIX ?? "/uploads/inventory"
    const normalizedPrefix = urlPrefix.endsWith("/") ? urlPrefix.slice(0, -1) : urlPrefix
    const url = `${normalizedPrefix}/${filename}`

    return NextResponse.json({ url, filename })
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
