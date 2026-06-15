/**
 * Ledger Service — Immutable Event Log & Style DNA Builder
 *
 * Every visitor action is an immutable event in lead_ledger_events.
 * The ledger drives three core capabilities:
 *
 * 1. **Event-Sourced Lead Scoring** — Score is computed by replaying
 *    all events for a lead. Always auditable and correctable.
 * 2. **Style DNA** — Aggregates visitor style/material/color preferences
 *    across sessions, enabling personalized recommendations.
 * 3. **Returning Visitor Memory** — Remembers past projects, interests,
 *    and conversation context for personalized greetings.
 *
 * "Postgres is the memory, the workflow engine is the brain."
 */

import { createSignal, computeLeadScore, type ScoringSignal } from './lead-scorer'

// ── Event Type Constants ──────────────────────────────────────

export const LEDGER_EVENTS = {
  LEAD_GATE_COMPLETED: 'lead_gate_completed',
  PRODUCT_PAGE_VISITED: 'product_page_visited',
  IMAGE_UPLOADED: 'image_uploaded',
  ITEM_ADDED_TO_CART: 'item_added_to_cart',
  HIGH_VALUE_CART: 'high_value_cart',
  LARGE_QUANTITY: 'large_quantity',
  RFQ_SUBMITTED: 'rfq_submitted',
  APPOINTMENT_REQUESTED: 'appointment_requested',
  VIBER_HANDOFF_ACCEPTED: 'viber_handoff_accepted',
  URGENT_TIMELINE: 'urgent_timeline',
  BUDGET_PROVIDED: 'budget_provided',
  BUYER_TYPE_IDENTIFIED: 'buyer_type_identified',
  PROJECT_LOCATION_GIVEN: 'project_location_given',
  MESSAGE_SENT: 'message_sent',
  LONG_CONVERSATION: 'long_conversation',
  EXISTING_CUSTOMER_LINKED: 'existing_customer_linked',
  COMPLAINT: 'complaint',
  ABANDONED_CHAT: 'abandoned_chat',
  QUOTE_VIEWED: 'quote_viewed',
  IMAGE_MATCHED: 'image_matched',
  STYLE_DNA_UPDATED: 'style_dna_updated',
} as const

export type LedgerEventType = typeof LEDGER_EVENTS[keyof typeof LEDGER_EVENTS]

// ── Event Score Map ───────────────────────────────────────────

export const EVENT_SCORES: Record<string, number> = {
  [LEDGER_EVENTS.LEAD_GATE_COMPLETED]: 5,
  [LEDGER_EVENTS.PRODUCT_PAGE_VISITED]: 3,
  [LEDGER_EVENTS.IMAGE_UPLOADED]: 15,
  [LEDGER_EVENTS.ITEM_ADDED_TO_CART]: 20,
  [LEDGER_EVENTS.HIGH_VALUE_CART]: 25,
  [LEDGER_EVENTS.LARGE_QUANTITY]: 20,
  [LEDGER_EVENTS.RFQ_SUBMITTED]: 30,
  [LEDGER_EVENTS.APPOINTMENT_REQUESTED]: 30,
  [LEDGER_EVENTS.VIBER_HANDOFF_ACCEPTED]: 15,
  [LEDGER_EVENTS.URGENT_TIMELINE]: 10,
  [LEDGER_EVENTS.BUDGET_PROVIDED]: 8,
  [LEDGER_EVENTS.BUYER_TYPE_IDENTIFIED]: 20,
  [LEDGER_EVENTS.PROJECT_LOCATION_GIVEN]: 5,
  [LEDGER_EVENTS.MESSAGE_SENT]: 2,
  [LEDGER_EVENTS.LONG_CONVERSATION]: 5,
  [LEDGER_EVENTS.EXISTING_CUSTOMER_LINKED]: 15,
  [LEDGER_EVENTS.COMPLAINT]: -5,
  [LEDGER_EVENTS.ABANDONED_CHAT]: -3,
  [LEDGER_EVENTS.QUOTE_VIEWED]: 5,
  [LEDGER_EVENTS.IMAGE_MATCHED]: 10,
  [LEDGER_EVENTS.STYLE_DNA_UPDATED]: 0,
}

export interface LedgerEvent {
  id?: string
  leadId: string
  conversationId?: string
  eventType: LedgerEventType
  eventData?: Record<string, unknown>
  scoreDelta: number
  createdAt?: string
}

export interface StyleDNA {
  styles: string[]
  materials: string[]
  colors: string[]
  categories: string[]
  roomTypes: string[]
  recentSearches: string[]
}

export interface VisitorProfile {
  leadId: string
  styleDNA: StyleDNA
  projectHistory: Array<{ projectType: string; date: string; status: string }>
  productAffinity: Record<string, number>
  totalVisits: number
  lastConversationSummary: string
  conversationCount: number
  totalMessages: number
}

// ── 1. Record Ledger Event ───────────────────────────────────

export function createLedgerEvent(
  leadId: string,
  eventType: LedgerEventType,
  eventData?: Record<string, unknown>,
  conversationId?: string
): LedgerEvent {
  return {
    leadId,
    conversationId,
    eventType,
    eventData,
    scoreDelta: EVENT_SCORES[eventType] || 0,
    createdAt: new Date().toISOString(),
  }
}

// ── 2. Replay Events to Compute Score ───────────────────────

export function computeScoreFromEvents(events: LedgerEvent[]): number {
  let score = 0
  for (const event of events) {
    score += event.scoreDelta
  }
  return Math.max(0, score)
}

export function eventsToScoringSignals(events: LedgerEvent[]): ScoringSignal[] {
  return events.map(e => createSignal(e.eventType, { ...e.eventData, delta: e.scoreDelta }))
}

// ── 3. Build Style DNA from Events ──────────────────────────

export function buildStyleDNA(events: LedgerEvent[]): StyleDNA {
  const styles = new Set<string>()
  const materials = new Set<string>()
  const colors = new Set<string>()
  const categories = new Set<string>()
  const roomTypes = new Set<string>()
  const recentSearches: string[] = []

  // Process events in chronological order (most recent last = highest weight)
  for (const event of events) {
    const data = event.eventData || {}

    if (data.style) {
      const styleArr = Array.isArray(data.style) ? data.style : [data.style]
      styleArr.forEach((s: string) => styles.add(s.toLowerCase()))
    }
    if (data.material) {
      const matArr = Array.isArray(data.material) ? data.material : [data.material]
      matArr.forEach((m: string) => materials.add(m.toLowerCase()))
    }
    if (data.color) {
      const colArr = Array.isArray(data.color) ? data.color : [data.color]
      colArr.forEach((c: string) => colors.add(c.toLowerCase()))
    }
    if (data.category) {
      categories.add(data.category as string)
    }
    if (data.roomType) {
      roomTypes.add(data.roomType as string)
    }
    if (data.searchQuery && typeof data.searchQuery === 'string') {
      recentSearches.push(data.searchQuery)
      if (recentSearches.length > 10) recentSearches.shift()
    }
  }

  return {
    styles: Array.from(styles),
    materials: Array.from(materials),
    colors: Array.from(colors),
    categories: Array.from(categories),
    roomTypes: Array.from(roomTypes),
    recentSearches: recentSearches.slice(-5), // keep last 5
  }
}

// ── 4. Generate Returning Visitor Greeting ─────────────────

export function generateReturningGreeting(
  name: string,
  styleDNA: StyleDNA,
  projectHistory: Array<{ projectType: string; status: string }>,
  lastSummary: string
): string {
  let greeting = `Welcome back, ${name.split(' ')[0]}!`

  if (lastSummary) {
    // Use the actual conversation summary
    greeting += ` Last time, ${lastSummary}`
  } else if (styleDNA.styles.length > 0 || styleDNA.categories.length > 0) {
    // Build from style DNA
    const styleStr = styleDNA.styles.slice(0, 2).join(' ')
    const catStr = styleDNA.categories.slice(0, 2).join(' and ')
    if (styleStr && catStr) {
      greeting += ` You were looking at ${styleStr} ${catStr}.`
    } else if (catStr) {
      greeting += ` You were looking at ${catStr}.`
    }
  }

  // Check for active projects
  const activeProjects = projectHistory.filter(p => p.status === 'rfq_submitted' || p.status === 'quoted')
  if (activeProjects.length > 0) {
    greeting += ` Would you like to check on your ${activeProjects[0].projectType} project?`
  } else {
    greeting += ` How can I help you today?`
  }

  return greeting
}

// ── 5. Update Style DNA from Extracted Attributes ──────────

export function mergeStyleDNA(
  currentDNA: StyleDNA,
  newAttributes: { style?: string[]; material?: string[]; color?: string[]; category?: string; roomType?: string }
): StyleDNA {
  const merged: StyleDNA = {
    styles: [...new Set([...currentDNA.styles, ...(newAttributes.style || []).map(s => s.toLowerCase())])],
    materials: [...new Set([...currentDNA.materials, ...(newAttributes.material || []).map(m => m.toLowerCase())])],
    colors: [...new Set([...currentDNA.colors, ...(newAttributes.color || []).map(c => c.toLowerCase())])],
    categories: newAttributes.category
      ? [...new Set([...currentDNA.categories, newAttributes.category])]
      : currentDNA.categories,
    roomTypes: newAttributes.roomType
      ? [...new Set([...currentDNA.roomTypes, newAttributes.roomType])]
      : currentDNA.roomTypes,
    recentSearches: currentDNA.recentSearches,
  }
  return merged
}

// ── 6. Product Search Boost from Style DNA ─────────────────

export function getSearchBoosts(styleDNA: StyleDNA): {
  styleBoost: string[]
  materialBoost: string[]
  colorBoost: string[]
  categoryBoost: string[]
} {
  return {
    styleBoost: styleDNA.styles,
    materialBoost: styleDNA.materials,
    colorBoost: styleDNA.colors,
    categoryBoost: styleDNA.categories,
  }
}
