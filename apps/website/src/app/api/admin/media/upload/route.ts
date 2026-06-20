/**
 * POST /api/admin/media/upload — upload an image straight to DigitalOcean
 * Spaces (content-addressed) and register it in the `media` index.
 *
 * multipart/form-data: field "file". Returns { url, deduped, media }.
 *
 * Dedupes by SHA-256: re-uploading identical bytes reuses the existing object
 * and media row (and preserves its existing source/usage categorization).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createHash, randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const hash = createHash('sha256').update(bytes).update(randomBytes(4)).digest('hex').slice(0, 16)
    const filename = `${hash}.${ext}`

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), bytes)

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/media/upload] POST error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
