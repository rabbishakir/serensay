import fs from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

function getUploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "uploads", "inventory")
}

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename
  const safeFilename = path.basename(filename)

  if (!safeFilename || safeFilename !== filename) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 })
  }

  const uploadDir = getUploadDir()
  const filepath = path.join(uploadDir, safeFilename)

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 })
  }

  const ext = path.extname(safeFilename).toLowerCase()
  const contentType = CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream"
  const fileBuffer = fs.readFileSync(filepath)

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
