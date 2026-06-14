#!/usr/bin/env node

/**
 * Hermes3 Reasoning Agent
 * 
 * Uses local Ollama hermes3 model for intelligent migration decisions:
 * - URL matching & conflict resolution
 * - Product data validation & enrichment
 * - Navigation structure analysis
 * - Component mapping (Liquid → Next.js)
 * - SEO quality assessment
 * - Error triage & recovery suggestions
 * - Cross-reference scanner vs export data
 * 
 * Usage:
 *   node hermes-agent.mjs analyze-url <shopify-url> <new-url>
 *   node hermes-agent.mjs match-products <scanner-json> <export-json>
 *   node hermes-agent.mjs analyze-nav <links-json>
 *   node hermes-agent.mjs suggest-component <liquid-description>
 *   node hermes-agent.mjs triage-error <error-json>
 *   node hermes-agent.mjs validate-seo <seo-json>
 *   node hermes-agent.mjs reason <prompt>
 *   node hermes-agent.mjs chat
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OLLAMA_URL = 'http://localhost:11434'
const MODEL = 'hermes3:latest'

// =============================================
// HERMES3 REASONING ENGINE
// =============================================

async function hermesReason(systemPrompt, userPrompt, options = {}) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      options: {
        temperature: options.temperature ?? 0.1,
        num_predict: options.maxTokens ?? 2048,
      }
    })
  })
  const data = await response.json()
  return data.message?.content || ''
}

// =============================================
// SYSTEM PROMPTS
// =============================================

const SYSTEM_PROMPTS = {
  default: `You are the Hermes3 Reasoning Agent for the HomeU Commerce migration project.
You help migrate 661 products from Shopify to a self-hosted DaVinciOS CMS + Next.js site.
Be precise, structured, and provide JSON output when possible.`,

  urlMatcher: `You are a URL mapping specialist for Shopify to DaVinciOS CMS migration.
Given a Shopify URL and a potential new URL, determine if they represent the same page.
Consider: product handles, collection slugs, page paths.
Output JSON: { "match": true/false, "confidence": 0-100, "reason": "..." }`,

  productMatcher: `You are a product data specialist.
Given product data from two sources (scanner vs export), determine if they match.
Match by: handle, title similarity, SKU, or price+description combination.
Output JSON array of matches with confidence scores.`,

  navAnalyzer: `You are a navigation structure analyst.
Given a flat list of links from a Shopify site, reconstruct the navigation hierarchy.
Identify: main menu items, submenus, mega menu groupings, footer links.
Output JSON: hierarchical navigation structure.`,

  componentMapper: `You are a Shopify Liquid to Next.js component mapping specialist.
Given a description of a Shopify Liquid section, suggest the best Next.js component match.
Consider: layout, functionality, data requirements.
Output JSON: { "nextjsComponent": "...", "confidence": 0-100, "rationale": "..." }`,

  errorTriage: `You are a migration error analyst.
Given a migration error, determine: root cause, severity, suggested fix.
Consider: network issues, data format mismatches, missing relationships.
Output JSON: { "rootCause": "...", "severity": "low/medium/high/critical", "suggestedFix": "...", "prevention": "..." }`,

  seoValidator: `You are an SEO migration specialist.
Given extracted SEO metadata from a Shopify page, validate:
- Title length (50-60 chars ideal)
- Meta description length (150-160 chars ideal)
- Canonical URL correctness
- Open Graph tag completeness
- JSON-LD structured data validity
Output JSON with scores and recommendations.`,
}

// =============================================
// COMMANDS
// =============================================

async function analyzeUrl(shopifyUrl, newUrl) {
  console.log(`🔗 URL Match Analysis`)
  console.log(`   Shopify: ${shopifyUrl}`)
  console.log(`   New:     ${newUrl}\n`)
  
  const result = await hermesReason(SYSTEM_PROMPTS.urlMatcher,
    `Shopify URL: ${shopifyUrl}\nNew URL: ${newUrl}\n\nDo these represent the same page?`)
  
  console.log(result)
  return result
}

async function matchProducts(scannerPath, exportPath) {
  const scannerData = JSON.parse(fs.readFileSync(scannerPath, 'utf-8'))
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
  
  console.log(`🔍 Cross-Reference: Scanner vs Export`)
  console.log(`   Scanner products: ${Array.isArray(scannerData) ? scannerData.length : 'N/A'}`)
  console.log(`   Export products:  ${Array.isArray(exportData) ? exportData.length : 'N/A'}\n`)
  
  const prompt = `Scanner data (first 5): ${JSON.stringify(scannerData.slice?.(0, 5) || scannerData)}
Export data (first 5): ${JSON.stringify(exportData.slice?.(0, 5) || exportData)}

Compare these product datasets. Identify:
1. Products found in both sets (matched by handle/title)
2. Products only in scanner (live site)
3. Products only in export (CSV)
4. Data quality issues (missing fields, mismatched prices)
5. Confidence score for the overall match quality`

  const result = await hermesReason(SYSTEM_PROMPTS.productMatcher, prompt)
  console.log(result)
  return result
}

async function analyzeNavigation(navJson) {
  const links = typeof navJson === 'string' ? JSON.parse(navJson) : navJson
  
  console.log(`🧭 Navigation Structure Analysis`)
  console.log(`   ${links.length} links to analyze\n`)
  
  const prompt = `Here are all links found on the homepage:\n\n${JSON.stringify(links, null, 2)}\n\nReconstruct the navigation hierarchy. Group into:
1. Main navigation (top-level + dropdowns)
2. Footer links
3. Secondary navigation

Output as structured JSON with parent-child relationships.`
  
  const result = await hermesReason(SYSTEM_PROMPTS.navAnalyzer, prompt)
  console.log(result)
  return result
}

async function suggestComponent(description) {
  console.log(`🧩 Component Mapping Suggestion`)
  console.log(`   Liquid: ${description}\n`)
  
  const result = await hermesReason(SYSTEM_PROMPTS.componentMapper,
    `Shopify Liquid section: ${description}\n\nWhat Next.js component should this map to?`)
  
  console.log(result)
  return result
}

async function triageError(errorJson) {
  const error = typeof errorJson === 'string' ? JSON.parse(errorJson) : errorJson
  
  console.log(`🚨 Error Triage`)
  console.log(`   Type: ${error.type || error.error_type || 'unknown'}`)
  console.log(`   Message: ${error.message || error.error_message || 'N/A'}\n`)
  
  const result = await hermesReason(SYSTEM_PROMPTS.errorTriage,
    `Migration Error:\n${JSON.stringify(error, null, 2)}\n\nAnalyze and suggest fix.`)
  
  console.log(result)
  return result
}

async function validateSeo(seoJson) {
  const seo = typeof seoJson === 'string' ? JSON.parse(seoJson) : seoJson
  
  console.log(`📊 SEO Validation`)
  console.log(`   Title: ${seo.title?.substring(0, 60)}...`)
  console.log(`   Description: ${seo.metaDescription?.substring(0, 60)}...\n`)
  
  const result = await hermesReason(SYSTEM_PROMPTS.seoValidator,
    `SEO Metadata:\n${JSON.stringify(seo, null, 2)}\n\nValidate and provide scores/recommendations.`)
  
  console.log(result)
  return result
}

async function reason(prompt) {
  console.log(`🧠 Hermes3 Reasoning\n   Prompt: ${prompt.substring(0, 80)}...\n`)
  const result = await hermesReason(SYSTEM_PROMPTS.default, prompt)
  console.log(result)
  return result
}

async function chat() {
  console.log('💬 Hermes3 Interactive Chat (Ctrl+C to exit)\n')
  const readline = (await import('readline')).default
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  
  const ask = () => {
    rl.question('🧠 > ', async (input) => {
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        rl.close()
        return
      }
      const result = await hermesReason(SYSTEM_PROMPTS.default, input)
      console.log(`\n${result}\n`)
      ask()
    })
  }
  ask()
}

// =============================================
// CLI
// =============================================

const command = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]

switch (command) {
  case 'analyze-url':    analyzeUrl(arg1, arg2); break
  case 'match-products': matchProducts(arg1, arg2); break
  case 'analyze-nav':    analyzeNavigation(arg1); break
  case 'suggest-component': suggestComponent(arg1); break
  case 'triage-error':   triageError(arg1); break
  case 'validate-seo':   validateSeo(arg1); break
  case 'reason':         reason(arg1); break
  case 'chat':           chat(); break
  default:
    console.log(`
🧠 HERMES3 REASONING AGENT
Usage:
  node hermes-agent.mjs analyze-url <shopify-url> <new-url>
  node hermes-agent.mjs match-products <scanner.json> <export.json>
  node hermes-agent.mjs analyze-nav '<json-links>'
  node hermes-agent.mjs suggest-component '<liquid-description>'
  node hermes-agent.mjs triage-error '<error-json>'
  node hermes-agent.mjs validate-seo '<seo-json>'
  node hermes-agent.mjs reason '<prompt>'
  node hermes-agent.mjs chat

Model: ${MODEL} (${OLLAMA_URL})
    `)
}
