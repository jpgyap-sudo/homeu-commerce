/**
 * Lead Scoring Engine
 *
 * Computes lead scores in real-time based on visitor signals:
 * - Lead gate completion
 * - Product browsing behavior
 * - Image uploads
 * - RFQ cart value and quantity
 * - Appointment requests
 * - Conversation engagement
 * - Intent signals (urgency, buyer type, project size)
 *
 * Score thresholds:
 *   0–20:  cold    (lead gen, nurture)
 *   21–50: warm    (qualified interest, follow-up)
 *   51–80: hot     (ready for sales contact)
 *   81–100: qualified (priority follow-up within 24h)
 */

export interface ScoringSignal {
  signal: string
  weight: number
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface LeadScore {
  score: number
  label: ScoreLabel
  signals: ScoringSignal[]
  buyerType?: string
  intentMatchCount: number
  avgSentiment: number
  urgencyDetected: boolean
}

export type ScoreLabel = 'cold' | 'warm' | 'hot' | 'qualified'

// ── Signal Weights ────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  lead_gate_completed: 5,
  product_page_visited: 3,
  multiple_pages_visited: 5,
  image_uploaded: 10,
  item_added_to_cart: 15,
  high_value_cart: 20,     // cart > ₱50,000
  large_quantity: 15,       // > 20 units
  rfq_submitted: 25,
  appointment_requested: 15,
  viber_handoff_accepted: 10,
  urgent_timeline: 10,      // "within 2 weeks" or sooner
  budget_provided: 8,
  buyer_type_architect: 10,
  buyer_type_hotel: 15,
  buyer_type_contractor: 12,
  message_sent: 2,
  long_conversation: 5,     // > 10 messages
  project_location_provided: 5,
  consent_given: 2,
  existing_customer_linked: 15, // registered customer using chat = warm lead
  complaint_or_escalation: -5,
  abandoned_chat: -3,
}

// ── Scoring Function ──────────────────────────────────────────

export function computeLeadScore(signals: ScoringSignal[]): LeadScore {
  let total = 0
  let intentMatchCount = 0
  let sentimentSum = 0
  let sentimentCount = 0
  let urgencyDetected = false
  let buyerType: string | undefined

  for (const s of signals) {
    const weight = SIGNAL_WEIGHTS[s.signal] || 0
    total += weight

    if (s.signal === 'urgent_timeline') urgencyDetected = true

    if (s.signal.startsWith('buyer_type_')) {
      buyerType = s.signal.replace('buyer_type_', '')
    }

    if (s.signal === 'message_sent') {
      intentMatchCount++
    }

    if (s.metadata?.sentiment !== undefined && typeof s.metadata.sentiment === 'number') {
      sentimentSum += s.metadata.sentiment as number
      sentimentCount++
    }

    if (s.signal === 'long_conversation') {
      intentMatchCount += 3
    }

    if (s.signal === 'rfq_submitted') intentMatchCount += 5
    if (s.signal === 'item_added_to_cart') intentMatchCount += 2
  }

  // Floor at 0
  total = Math.max(0, total)

  const label = scoreToLabel(total)

  return {
    score: total,
    label,
    signals,
    buyerType,
    intentMatchCount,
    avgSentiment: sentimentCount > 0 ? sentimentSum / sentimentCount : 0,
    urgencyDetected,
  }
}

// ── Score to Label ────────────────────────────────────────────

function scoreToLabel(score: number): ScoreLabel {
  if (score >= 81) return 'qualified'
  if (score >= 51) return 'hot'
  if (score >= 21) return 'warm'
  return 'cold'
}

// ── Scoring Helpers ───────────────────────────────────────────

export function createSignal(name: string, metadata?: Record<string, unknown>): ScoringSignal {
  return {
    signal: name,
    weight: SIGNAL_WEIGHTS[name] || 0,
    timestamp: new Date().toISOString(),
    metadata,
  }
}

export function predictBuyerType(signals: ScoringSignal[]): string | undefined {
  for (const s of signals) {
    if (s.signal.startsWith('buyer_type_')) {
      return s.signal.replace('buyer_type_', '')
    }
  }
  return undefined
}
