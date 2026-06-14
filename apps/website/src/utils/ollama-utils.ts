import { Ollama } from 'ollama'

// Initialize Ollama client
const ollama = new Ollama({ host: 'http://localhost:11434' })

export async function generatePricingSuggestions(items: any[]) {
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

    // Call Ollama model
    const response = await ollama.generate({
      model: 'llama3.2:3b', // or whatever model you have installed
      prompt,
      stream: false,
    })

    return response.response
  } catch (error) {
    console.error('Ollama pricing suggestion error:', error)
    return 'Pricing suggestions unavailable at this time.'
  }
}