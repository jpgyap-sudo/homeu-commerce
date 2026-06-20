/**
 * GET /api/quotations/[id]/versions — version history for a quotation
 */
import { NextRequest, NextResponse } from 'next/server'
import { getVersionHistory } from '@/lib/quotation-versions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const versions = await getVersionHistory(id)
    return NextResponse.json({ versions })
  } catch (err: any) {
    console.error('[quotation versions] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}
