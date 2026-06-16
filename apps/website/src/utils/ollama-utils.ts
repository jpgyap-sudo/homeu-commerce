import { Ollama } from 'ollama'

// Initialize Ollama client with a short request timeout
const OLLAMA_HOST = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b'
const ollama = new Ollama({ host: OLLAMA_HOST })

/**
 * Quick health-check: ping Ollama before making expensive generate calls.
 * Returns true if Ollama is reachable within 3 seconds.
 */
async function isOllamaReachable(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: controller.signal })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

export async function generatePricingSuggestions(items: any[]) {
  // Fast-fail if Ollama is not running
  if (!(await isOllamaReachable())) {
    console.warn('[ollama-utils] Ollama not reachable — skipping pricing suggestions')
    return 'Pricing suggestions unavailable at this time.'
  }

  try {
    // Prepare prompt for Ollama
    const productList = items
      .map(
        (item) =>
          `- ${item.title} (SKU: ${item.skuSnapshot || 'N/A'}) - Quantity: ${
            item.quantity
          }`
      )
      .join('\n')

    const prompt = `
You are a pricing expert for home furniture and decor. Based on the following products requested in an RFQ, provide competitive price suggestions and market insights.

Products:
${productList}

Please provide:
1. Estimated price range for each product (low, medium, high)
2. Any market trends or seasonal factors affecting pricing
3. Suggested total budget range for the entire request
4. Any recommendations for alternative materials or styles that could reduce cost

Keep the response concise and professional.
`

    // Call Ollama model with a 15-second timeout
    const response = await (ollama.generate as any)({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      signal: AbortSignal.timeout(15000),
    })

    return response.response
  } catch (error) {
    console.error('Ollama pricing suggestion error:', error)
    return 'Pricing suggestions unavailable at this time.'
  }
}