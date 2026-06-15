/**
 * AI Provider Abstraction Layer
 *
 * Provider-agnostic interface for text generation, image analysis, and embeddings.
 * Supports Gemini, OpenAI, and Ollama (local). Configurable via AI_PROVIDER env var.
 *
 * Usage:
 *   const ai = getAIProvider()
 *   const reply = await ai.generateText('User message', 'System prompt')
 *   const attrs = await ai.analyzeImage(url, 'Describe this furniture')
 */

export interface IntentResult {
  intent: string
  confidence: number
  entities: Record<string, unknown>
  nextAction: string
  shouldEscalate: boolean
  shouldOfferViber: boolean
}

export interface AIProvider {
  name: string
  generateText(prompt: string, system?: string, signal?: AbortSignal): Promise<string>
  analyzeImage(imageUrl: string, prompt: string, signal?: AbortSignal): Promise<string>
  createEmbedding(text: string, signal?: AbortSignal): Promise<number[]>
  classifyIntent(text: string, context?: string, signal?: AbortSignal): Promise<IntentResult>
}

// ── Gemini Provider ──────────────────────────────────────────

class GeminiProvider implements AIProvider {
  name = 'gemini'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) console.warn('[chatbot] GEMINI_API_KEY not set')
  }

  private async fetch(endpoint: string, body: unknown, signal?: AbortSignal) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`)
    }
    return res.json()
  }

  async generateText(prompt: string, system = '', signal?: AbortSignal): Promise<string> {
    const data = await this.fetch('gemini-2.0-flash:generateContent', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }, signal)
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  async analyzeImage(imageUrl: string, prompt: string, signal?: AbortSignal): Promise<string> {
    const data = await this.fetch('gemini-2.0-flash:generateContent', {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: await this.imageToBase64(imageUrl) } },
        ],
      }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
    }, signal)
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  private async imageToBase64(url: string): Promise<string> {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return Buffer.from(buf).toString('base64')
  }

  async createEmbedding(text: string, signal?: AbortSignal): Promise<number[]> {
    const data = await this.fetch('text-embedding-004:embedContent', {
      content: { parts: [{ text }] },
    }, signal)
    return data?.embedding?.values || []
  }

  async classifyIntent(text: string, context = '', signal?: AbortSignal): Promise<IntentResult> {
    const systemPrompt = `You are an intent classifier for a furniture/home chatbot.
Return ONLY valid JSON with fields: intent, confidence (0-1), entities (object), nextAction, shouldEscalate (boolean), shouldOfferViber (boolean).
Intents: PRODUCT_SEARCH, IMAGE_MATCH, RFQ_REQUEST, APPOINTMENT_REQUEST, PRICE_QUESTION, AVAILABILITY_QUESTION, DELIVERY_QUESTION, CUSTOM_FURNITURE, SALES_HANDOFF, COMPLAINT, FAQ, GREETING, UNKNOWN.`
    const result = await this.generateText(
      `Classify this message: "${text}"${context ? `\nContext: ${context}` : ''}`,
      systemPrompt, signal
    )
    try {
      return JSON.parse(this.extractJson(result)) as IntentResult
    } catch {
      return { intent: 'UNKNOWN', confidence: 0, entities: {}, nextAction: 'FALLBACK', shouldEscalate: false, shouldOfferViber: false }
    }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? match[0] : '{}'
  }
}

// ── OpenAI Provider ───────────────────────────────────────────

class OpenAIProvider implements AIProvider {
  name = 'openai'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) console.warn('[chatbot] OPENAI_API_KEY not set')
  }

  private async fetch(endpoint: string, body: unknown, signal?: AbortSignal) {
    const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body), signal,
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`)
    }
    return res.json()
  }

  async generateText(prompt: string, system = '', signal?: AbortSignal): Promise<string> {
    const messages: { role: string; content: string }[] = []
    if (system) messages.push({ role: 'system', content: system })
    messages.push({ role: 'user', content: prompt })
    const data = await this.fetch('chat/completions', {
      model: 'gpt-4o-mini', messages, temperature: 0.7, max_tokens: 1024,
    }, signal)
    return data?.choices?.[0]?.message?.content || ''
  }

  async analyzeImage(imageUrl: string, prompt: string, signal?: AbortSignal): Promise<string> {
    const data = await this.fetch('chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }] }],
      temperature: 0.4, max_tokens: 512,
    }, signal)
    return data?.choices?.[0]?.message?.content || ''
  }

  async createEmbedding(text: string, signal?: AbortSignal): Promise<number[]> {
    const data = await this.fetch('embeddings', { model: 'text-embedding-3-small', input: text }, signal)
    return data?.data?.[0]?.embedding || []
  }

  async classifyIntent(text: string, _context = '', signal?: AbortSignal): Promise<IntentResult> {
    const systemPrompt = `You are an intent classifier for a furniture/home chatbot. Return ONLY valid JSON with fields: intent, confidence (0-1), entities (object), nextAction, shouldEscalate (boolean), shouldOfferViber (boolean). Intents: PRODUCT_SEARCH, IMAGE_MATCH, RFQ_REQUEST, APPOINTMENT_REQUEST, PRICE_QUESTION, AVAILABILITY_QUESTION, DELIVERY_QUESTION, CUSTOM_FURNITURE, SALES_HANDOFF, COMPLAINT, FAQ, GREETING, UNKNOWN.`
    const result = await this.generateText(`Classify: "${text}"`, systemPrompt, signal)
    try { return JSON.parse(result) as IntentResult }
    catch { return { intent: 'UNKNOWN', confidence: 0, entities: {}, nextAction: 'FALLBACK', shouldEscalate: false, shouldOfferViber: false } }
  }
}

// ── Ollama Provider (local, fallback) ─────────────────────────

class OllamaProvider implements AIProvider {
  name = 'ollama'
  private baseUrl: string
  private modelName: string

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.modelName = process.env.OLLAMA_MODEL || 'qwen3:4b'
  }

  private async fetch(body: unknown, signal?: AbortSignal) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal,
    })
    if (!res.ok) throw new Error(`Ollama error ${res.status}`)
    return res.json()
  }

  async generateText(prompt: string, system = '', signal?: AbortSignal): Promise<string> {
    const messages: { role: string; content: string }[] = []
    if (system) messages.push({ role: 'system', content: system })
    messages.push({ role: 'user', content: prompt })
    const data = await this.fetch({ model: this.modelName, messages, stream: false, options: { temperature: 0.7 } }, signal)
    return data?.message?.content || ''
  }

  async analyzeImage(_imageUrl: string, prompt: string, signal?: AbortSignal): Promise<string> {
    // Fallback: use text-only model for image description
    return this.generateText(`Describe furniture from this image (text-only mode): ${prompt}`, '', signal)
  }

  async createEmbedding(text: string, signal?: AbortSignal): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }), signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    return data?.embedding || []
  }

  async classifyIntent(text: string, _context = '', signal?: AbortSignal): Promise<IntentResult> {
    const prompt = `Classify this message for a furniture chatbot. Return ONLY JSON: {"intent": "...", "confidence": 0.0, "entities": {}, "nextAction": "...", "shouldEscalate": false, "shouldOfferViber": false}\nMessage: "${text}"\nIntents: PRODUCT_SEARCH, IMAGE_MATCH, RFQ_REQUEST, APPOINTMENT_REQUEST, PRICE_QUESTION, AVAILABILITY_QUESTION, DELIVERY_QUESTION, CUSTOM_FURNITURE, SALES_HANDOFF, COMPLAINT, FAQ, GREETING, UNKNOWN`
    const result = await this.generateText(prompt, '', signal)
    try { return JSON.parse(this.extractJson(result)) as IntentResult }
    catch { return { intent: 'UNKNOWN', confidence: 0, entities: {}, nextAction: 'FALLBACK', shouldEscalate: false, shouldOfferViber: false } }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? match[0] : '{}'
  }
}

// ── Factory ───────────────────────────────────────────────────

let cachedProvider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider
  const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  switch (providerName) {
    case 'openai':
      cachedProvider = new OpenAIProvider()
      break
    case 'ollama':
      cachedProvider = new OllamaProvider()
      break
    case 'gemini':
    default:
      cachedProvider = new GeminiProvider()
      break
  }
  return cachedProvider
}

export function resetAIProvider(): void {
  cachedProvider = null
}
