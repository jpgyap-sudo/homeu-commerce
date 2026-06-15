/**
 * GET /api/chat/visitor?email=xxx
 *
 * Returns returning visitor profile by email.
 * Used for personalized greetings and style DNA recall.
 *
 * Response: {
 *   found: boolean,
 *   lead?: { id, name, styleDNA, lastConversationSummary, projectHistory },
 *   greeting?: string   // personalized returning visitor greeting
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateReturningGreeting } from '@/lib/chatbot/ledger'

// In-memory store for MVP (mirrors ledger store)
const visitorStore: Map<string, any> = new Map()

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email?.trim()) {
      return NextResponse.json({ found: false })
    }

    // In production: SELECT * FROM chatbot.leads WHERE email = $1 ORDER BY created_at DESC LIMIT 1
    const profile = visitorStore.get(email.trim().toLowerCase())

    if (!profile) {
      return NextResponse.json({ found: false })
    }

    const greeting = generateReturningGreeting(
      profile.name,
      profile.styleDNA || { styles: [], materials: [], colors: [], categories: [], roomTypes: [], recentSearches: [] },
      profile.projectHistory || [],
      profile.lastConversationSummary || ''
    )

    return NextResponse.json({
      found: true,
      lead: {
        id: profile.leadId,
        name: profile.name,
        styleDNA: profile.styleDNA,
        lastConversationSummary: profile.lastConversationSummary,
        projectHistory: profile.projectHistory,
      },
      greeting,
    })
  } catch {
    return NextResponse.json({ found: false })
  }
}

// Helper to store/update visitor profile (called by other APIs)
export function upsertVisitorProfile(leadId: string, data: {
  email: string
  name: string
  styleDNA?: any
  lastConversationSummary?: string
  projectHistory?: any[]
}) {
  const key = data.email.trim().toLowerCase()
  const existing = visitorStore.get(key) || {}
  visitorStore.set(key, {
    ...existing,
    leadId,
    name: data.name,
    email: data.email,
    styleDNA: data.styleDNA || existing.styleDNA,
    lastConversationSummary: data.lastConversationSummary || existing.lastConversationSummary,
    projectHistory: data.projectHistory || existing.projectHistory || [],
    updatedAt: new Date().toISOString(),
  })
}
