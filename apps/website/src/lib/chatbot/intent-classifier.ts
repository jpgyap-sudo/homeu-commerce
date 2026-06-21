/**
 * Intent Classifier
 *
 * Hybrid classifier: rule-based patterns for fast common intents,
 * falls back to AI provider for complex or ambiguous messages.
 *
 * The classifier extracts the visitor's intent from their message,
 * along with entities (product category, quantity, location, etc.)
 * and suggests the next bot action.
 */

import { getAIProvider, type IntentResult } from './ai-provider'

export interface ClassifiedIntent extends IntentResult {
  rawMessage: string
  extractedEntities: ExtractedEntities
}

export interface ExtractedEntities {
  category?: string
  quantity?: number
  location?: string
  timeline?: string
  budget?: string
  style?: string[]
  material?: string[]
  color?: string[]
  roomType?: string
}

// ── Rule-Based Patterns ───────────────────────────────────────

const PATTERNS: { regex: RegExp; intent: string; extract: (match: RegExpMatchArray) => Partial<ExtractedEntities> }[] = [
  // Quantity: "40 chairs", "10 pieces", "50 units"
  { regex: /(\d+)\s*(pcs?|pieces?|units?|chairs?|tables?|sets?)/i, intent: 'RFQ_REQUEST', extract: (m) => ({ quantity: parseInt(m[1]) }) },

  // Category + quantity: "dining chairs 40"
  { regex: /(\d+)\s*(pcs?|pieces?|units?)?\s*(dining|bedroom|living|office|restaurant|hotel)/i, intent: 'RFQ_REQUEST', extract: (m) => ({ quantity: parseInt(m[1]), roomType: m[3]?.toLowerCase() }) },

  // Location: "in BGC", "deliver to Makati", "Manila"
  { regex: /(?:in|to|at|deliver\s*to)\s+([A-Za-z\s,]+?)(?:\.|,|$)/i, intent: 'DELIVERY_QUESTION', extract: (m) => ({ location: m[1].trim() }) },

  // Style + category: "modern dining chair", "scandinavian sofa"
  { regex: /(modern|scandinavian|mid-century|contemporary|minimalist|industrial|bohemian|vintage|classic|transitional|coastal|rustic)\s+(.+)/i, intent: 'PRODUCT_SEARCH', extract: (m) => ({ style: [m[1].toLowerCase()], category: m[2].trim() }) },

  // Material: "wooden", "fabric", "marble", "metal"
  { regex: /\b(wooden|solid wood|oak|walnut|fabric|linen|velvet|leather|marble|glass|metal|brass|gold|stainless|rattan|cane|concrete)\b/i, intent: 'PRODUCT_SEARCH', extract: (m) => ({ material: [m[1].toLowerCase()] }) },

  // Color: "beige", "gray", "white", "black"
  { regex: /\b(beige|gray|grey|white|black|brown|green|blue|red|gold|silver|cream|walnut|oak)\b/i, intent: 'PRODUCT_SEARCH', extract: (m) => ({ color: [m[1].toLowerCase()] }) },

  // Appointment keywords
  { regex: /\b(showroom|visit|appointment|book|schedule|see in person|view in store)\b/i, intent: 'APPOINTMENT_REQUEST', extract: () => ({}) },

  // Price questions
  { regex: /\b(how much|price|cost|pricing|magkano|rate)\b/i, intent: 'PRICE_QUESTION', extract: () => ({}) },

  // Availability
  { regex: /\b(in stock|available|stock|ready|lead time|shipping|delivery\s+time)\b/i, intent: 'AVAILABILITY_QUESTION', extract: () => ({}) },

  // Custom furniture
  { regex: /\b(custom|bespoke|made to order|special order|modified|personalized)\b/i, intent: 'CUSTOM_FURNITURE', extract: () => ({}) },

  // Viber / sales handoff
  { regex: /\b(viber|whatsapp|call|talk to|speak to|agent|sales|representative|human|person)\b/i, intent: 'SALES_HANDOFF', extract: () => ({}) },

  // Greeting
  { regex: /^(hi|hello|hey|good\s*(morning|afternoon|evening)|kamusta|maayong)\b/i, intent: 'GREETING', extract: () => ({}) },

  // Complaint
  { regex: /\b(complaint|unhappy|dissatisfied|poor|bad|problem|issue|not working|broken|damage)\b/i, intent: 'COMPLAINT', extract: () => ({}) },

  // Delivery
  { regex: /\b(delivery|shipping|freight|ship|deliver|shipment|logistics)\b/i, intent: 'DELIVERY_QUESTION', extract: () => ({}) },

  // Budget / timeline
  { regex: /\b(budget|spend|price range|max|under)\s+(\d+[kK]?)/i, intent: 'RFQ_REQUEST', extract: (m) => ({ budget: m[2] }) },
  { regex: /\b(within|in|by|before)\s+(\d+\s*(week|month|day|year)s?)/i, intent: 'RFQ_REQUEST', extract: (m) => ({ timeline: m[0] }) },

  // Image upload intent
  { regex: /\b(look\s*(like|similar)|matching|match this|find this|photo|picture|image|upload)\b/i, intent: 'IMAGE_MATCH', extract: () => ({}) },
]

// ── Category Keywords ─────────────────────────────────────────

const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['dining chair', 'dining chair', 'chair for dining', 'dining seat'], category: 'Dining Chair' },
  { keywords: ['sofa', 'couch', 'settee', 'loveseat', '3-seater'], category: 'Sofa' },
  { keywords: ['table', 'dining table', 'coffee table', 'side table', 'console table', 'end table'], category: 'Table' },
  { keywords: ['lamp', 'pendant', 'chandelier', 'ceiling light', 'floor lamp', 'table lamp', 'wall light', 'sconce'], category: 'Lighting' },
  { keywords: ['cabinet', 'sideboard', 'buffet', 'credenza', 'cabinet'], category: 'Cabinet' },
  { keywords: ['bookshelf', 'shelf', 'bookcase', 'shelving'], category: 'Bookshelf' },
  { keywords: ['bed', 'bed frame', 'headboard', 'bed frame'], category: 'Bed' },
  { keywords: ['rug', 'carpet', 'runner', 'area rug'], category: 'Rug' },
  { keywords: ['mirror', 'wall mirror', 'decorative mirror'], category: 'Mirror' },
  { keywords: ['accent chair', 'armchair', 'lounge chair', 'club chair', 'tub chair'], category: 'Accent Chair' },
  { keywords: ['storage', 'cabinet', 'chest', 'drawer', 'dresser'], category: 'Storage' },
  { keywords: ['outdoor', 'patio', 'garden', 'terrace', 'balcony'], category: 'Outdoor' },
  { keywords: ['ceiling fan', 'fan', 'ceiling fan with light'], category: 'Ceiling Fan' },
  { keywords: ['wall panel', 'slat panel', 'fluted panel', 'wall cladding'], category: 'Wall Panel' },
]

// ── Classifier ────────────────────────────────────────────────

export function classifyIntentRuleBased(text: string, context?: string): ClassifiedIntent | null {
  const lower = text.toLowerCase().trim()

  // Try pattern matching
  for (const pattern of PATTERNS) {
    const match = lower.match(pattern.regex)
    if (match) {
      const extracted = pattern.extract(match)

      // Detect category from keywords
      if (!extracted.category) {
        for (const cat of CATEGORY_KEYWORDS) {
          if (cat.keywords.some(kw => lower.includes(kw))) {
            extracted.category = cat.category
            break
          }
        }
      }

      return {
        intent: pattern.intent,
        confidence: 0.75,
        entities: extracted,
        rawMessage: text,
        extractedEntities: extracted,
        nextAction: determineNextAction(pattern.intent, extracted),
        shouldEscalate: pattern.intent === 'COMPLAINT' || pattern.intent === 'CUSTOM_FURNITURE',
        shouldOfferViber: ['RFQ_REQUEST', 'PRICE_QUESTION', 'AVAILABILITY_QUESTION'].includes(pattern.intent),
      }
    }
  }

  return null
}

export async function classifyIntentAI(text: string, context?: string): Promise<ClassifiedIntent> {
  try {
    const ai = await getAIProvider()
    const result = await ai.classifyIntent(text, context)

    const extracted: ExtractedEntities = {}
    if (result.entities) {
      if (typeof result.entities.category === 'string') extracted.category = result.entities.category
      if (typeof result.entities.quantity === 'number') extracted.quantity = result.entities.quantity
      if (typeof result.entities.location === 'string') extracted.location = result.entities.location
      if (typeof result.entities.timeline === 'string') extracted.timeline = result.entities.timeline
      if (typeof result.entities.budget === 'string') extracted.budget = result.entities.budget
      if (Array.isArray(result.entities.style)) extracted.style = result.entities.style as string[]
      if (Array.isArray(result.entities.material)) extracted.material = result.entities.material as string[]
      if (Array.isArray(result.entities.color)) extracted.color = result.entities.color as string[]
      if (typeof result.entities.roomType === 'string') extracted.roomType = result.entities.roomType
    }

    return {
      ...result,
      rawMessage: text,
      extractedEntities: extracted,
    }
  } catch {
    return {
      intent: 'UNKNOWN', confidence: 0, entities: {},
      rawMessage: text, extractedEntities: {},
      nextAction: 'FALLBACK', shouldEscalate: false, shouldOfferViber: true,
    }
  }
}

export async function classifyIntent(text: string, context?: string): Promise<ClassifiedIntent> {
  // Try rule-based first for speed
  const ruleResult = classifyIntentRuleBased(text, context)
  if (ruleResult && ruleResult.confidence >= 0.7) {
    return ruleResult
  }

  // Fall back to AI for complex messages
  return classifyIntentAI(text, context)
}

// ── Next Action Determination ─────────────────────────────────

function determineNextAction(intent: string, entities: ExtractedEntities): string {
  switch (intent) {
    case 'GREETING':
      return 'GREET'
    case 'PRODUCT_SEARCH':
    case 'IMAGE_MATCH':
      if (!entities.category && !entities.style && !entities.material) return 'ASK_CLARIFYING_QUESTION'
      return 'RECOMMEND_PRODUCTS'
    case 'RFQ_REQUEST':
      if (!entities.quantity) return 'ASK_QUANTITY'
      if (!entities.location) return 'ASK_LOCATION'
      return 'ADD_TO_RFQ_CART'
    case 'PRICE_QUESTION':
    case 'AVAILABILITY_QUESTION':
    case 'DELIVERY_QUESTION':
      return 'ANSWER_FAQ'
    case 'APPOINTMENT_REQUEST':
      return 'OFFER_APPOINTMENT'
    case 'SALES_HANDOFF':
      return 'OFFER_VIBER'
    case 'COMPLAINT':
    case 'CUSTOM_FURNITURE':
      return 'ESCALATE_HUMAN'
    case 'FAQ':
      return 'ANSWER_FAQ'
    default:
      return 'FALLBACK'
  }
}
