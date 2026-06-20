/**
 * GET /api/admin/rfq-chat/[rfqId]/suggestions
 *
 * Returns AI-powered smart reply suggestions for the admin.
 * Analyzes the recent message context and generates relevant reply options.
 *
 * Uses the existing AIProvider from the chatbot system.
 * Falls back to template-based suggestions if AI is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminMessages } from '@/lib/rfq-chat-db'
import { getConversationByRfqId } from '@/lib/rfq-chat-db'

const FALLBACK_SUGGESTIONS = [
  { id: '1', text: 'We\'ll prepare a quotation for you and send it via email.', icon: '\u{1F4E8}' },
  { id: '2', text: 'Let me check with our team and get back to you on that.', icon: '\u{1F50D}' },
  { id: '3', text: 'Would you like to schedule a showroom visit to see the items in person?', icon: '\u{1F3E0}' },
  { id: '4', text: 'Delivery typically takes 2-3 weeks for Metro Manila areas.', icon: '\u{1F69A}' },
  { id: '5', text: 'I\'ve updated the quotation. You can view the latest version in your dashboard.', icon: '\u{270F}\uFE0F' },
  { id: '6', text: 'Could you provide more details about the style or material you prefer?', icon: '\u{2753}' },
]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfqId } = await params
    const rfqRequestId = parseInt(rfqId)
    if (isNaN(rfqRequestId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    const conversation = await getConversationByRfqId(rfqRequestId)
    if (!conversation) {
      return NextResponse.json({ suggestions: FALLBACK_SUGGESTIONS })
    }

    const messages = await getAdminMessages(conversation.id)
    const recentMessages = messages.slice(-10) // last 10 messages for context

    // Build context for AI
    const contextLines = recentMessages.map((m: any) =>
      `[${m.sender_type}] ${m.content}`
    )
    const contextStr = contextLines.join('\n')

    // Try AI-powered suggestions
    try {
      const aiProvider = await getAIProvider()
      const prompt = `Based on this RFQ chat conversation, suggest 4 short reply options the admin could send next.
Each reply should be 1-2 sentences, professional and helpful for a furniture/home store context.

Conversation:
${contextStr}

Return ONLY a JSON array of strings, max 4 items. Example: ["Thanks for your inquiry!", "Let me check that for you."]`

      const result = await aiProvider.generateText(prompt, '', AbortSignal.timeout(5000))
      const parsed = tryParseJsonArray(result)

      if (parsed && parsed.length > 0) {
        const suggestions = parsed.slice(0, 4).map((text: string, i: number) => ({
          id: `ai-${i}`,
          text,
          icon: getIconForSuggestion(text),
          aiGenerated: true,
        }))
        return NextResponse.json({ suggestions })
      }
    } catch {
      // AI failed, use fallback
    }

    // Return fallback suggestions
    const relevantSuggestions = getRelevantFallbacks(recentMessages)
    return NextResponse.json({ suggestions: relevantSuggestions })
  } catch (err: any) {
    console.error('[admin/rfq-chat/suggestions] Error:', err.message)
    return NextResponse.json({ suggestions: FALLBACK_SUGGESTIONS })
  }
}

/**
 * Get the AI provider (same as chatbot system)
 */
async function getAIProvider() {
  const { getAIProvider: providerFn } = await import('@/lib/chatbot/ai-provider')
  return providerFn()
}

/**
 * Try to parse a JSON array from AI response
 */
function tryParseJsonArray(text: string): string[] | null {
  try {
    // Find array in response
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Pick relevant fallback suggestions based on recent conversation context
 */
function getRelevantFallbacks(recentMessages: any[]): typeof FALLBACK_SUGGESTIONS {
  const lastMsg = recentMessages[recentMessages.length - 1]
  const allText = recentMessages.map((m: any) => (m.content || '').toLowerCase()).join(' ')
  const lastText = (lastMsg?.content || '').toLowerCase()

  // Pick suggestions relevant to context
  const relevant: typeof FALLBACK_SUGGESTIONS = []

  if (/pric|cost|how much|budget|discount/.test(allText)) {
    relevant.push(FALLBACK_SUGGESTIONS[0]) // quotation
  }
  if (/delivery|shipping|when|lead.?time|how long/.test(allText)) {
    relevant.push(FALLBACK_SUGGESTIONS[3]) // delivery
  }
  if (/visit|showroom|see|view|meet/.test(allText)) {
    relevant.push(FALLBACK_SUGGESTIONS[2]) // showroom
  }
  if (/style|material|color|option|alternative|prefer/.test(allText)) {
    relevant.push(FALLBACK_SUGGESTIONS[5]) // details
  }
  if (/revis|change|update|modify|adjust/.test(allText)) {
    relevant.push(FALLBACK_SUGGESTIONS[4]) // updated
  }

  // Fill remaining with generic suggestions
  const generic = FALLBACK_SUGGESTIONS.filter((_, i) =>
    ![0, 2, 3, 4, 5].includes(i)
  )

  while (relevant.length < 3 && generic.length > 0) {
    const g = generic.shift()
    if (g && !relevant.some(r => r.id === g.id)) {
      relevant.push(g)
    }
  }

  return relevant.slice(0, 4)
}

/**
 * Pick an emoji icon based on suggestion content
 */
function getIconForSuggestion(text: string): string {
  const lower = text.toLowerCase()
  if (/quotation|quote|pric|cost/.test(lower)) return '\u{1F4E8}'
  if (/delivery|shipping|lead.?time/.test(lower)) return '\u{1F69A}'
  if (/visit|showroom/.test(lower)) return '\u{1F3E0}'
  if (/style|material|color/.test(lower)) return '\u{1F3A8}'
  if (/revis|update|change/.test(lower)) return '\u{270F}\uFE0F'
  if (/thank|welcome|glad/.test(lower)) return '\u{1F60A}'
  if (/check|ask|team/.test(lower)) return '\u{1F50D}'
  return '\u{1F4AC}'
}
