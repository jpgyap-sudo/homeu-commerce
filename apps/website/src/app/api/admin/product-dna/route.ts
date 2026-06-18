import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { computeDNAScores } from '@/lib/product-dna'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const bottom = url.searchParams.get('bottom') === '1'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)

    const { summary, products } = await computeDNAScores()

    // Sort by score ascending when bottom flag
    if (bottom) products.sort((a, b) => a.score - b.score)
    // Already sorted descending by default

    return NextResponse.json({ summary, products: products.slice(0, limit) })
  } catch (error: any) {
    console.error('[product-dna] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
