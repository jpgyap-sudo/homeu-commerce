#!/usr/bin/env node

/**
 * Ollama Vision Analysis Tool
 * 
 * Uses llava:7b (or other vision models) to analyze website screenshots
 * and verify visual consistency between Shopify and new site.
 * 
 * Usage:
 *   node tools/playwright-scanner/ollama-vision.mjs analyze <image-path> [prompt]
 *   node tools/playwright-scanner/ollama-vision.mjs batch <directory>
 *   node tools/playwright-scanner/ollama-vision.mjs verify <shopify-screenshot> <new-screenshot>
 *   node tools/playwright-scanner/ollama-vision.mjs list-models
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OLLAMA_URL = 'http://localhost:11434'

async function ollamaGenerate(model, prompt, imagePath) {
  const base64 = fs.readFileSync(imagePath).toString('base64')
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      images: [base64],
      stream: false,
      options: {
        temperature: 0.1,  // Low temperature for consistent analysis
        num_predict: 1024,
      }
    })
  })
  const data = await response.json()
  return data.response
}

async function listModels() {
  const response = await fetch(`${OLLAMA_URL}/api/tags`)
  const data = await response.json()
  const visionModels = data.models.filter(m => 
    m.name.includes('llava') || m.name.includes('moondream') || m.name.includes('vision')
  )
  console.log('Available Vision Models:')
  visionModels.forEach(m => {
    console.log(`  ${m.name.padEnd(20)} ${(m.size / 1e9).toFixed(1)} GB`)
  })
  if (visionModels.length === 0) {
    console.log('  No vision models found. Pull one: ollama pull llava:7b')
  }
}

async function analyzeImage(imagePath, prompt) {
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`)
    process.exit(1)
  }
  
  const defaultPrompt = prompt || 'Describe this web page in detail: what is the page structure, layout, colors, navigation, content sections, and any visible products or text. Focus on visual elements that would need to be replicated.'
  
  console.log(`🧠 Analyzing: ${path.basename(imagePath)}`)
  console.log(`   Model: llava:7b`)
  console.log(`   Prompt: ${defaultPrompt.substring(0, 80)}...\n`)
  
  const result = await ollamaGenerate('llava:7b', defaultPrompt, imagePath)
  console.log(result)
  
  // Save analysis
  const analysisFile = imagePath.replace(/\.\w+$/, '.analysis.txt')
  fs.writeFileSync(analysisFile, result)
  console.log(`\n💾 Analysis saved: ${path.basename(analysisFile)}`)
}

async function batchAnalyze(directory) {
  if (!fs.existsSync(directory)) {
    console.error(`Directory not found: ${directory}`)
    process.exit(1)
  }
  
  const images = fs.readdirSync(directory)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .sort()
  
  console.log(`📂 Batch analyzing ${images.length} images in ${directory}\n`)
  
  for (const img of images) {
    const imagePath = path.join(directory, img)
    const analysisFile = imagePath.replace(/\.\w+$/, '.analysis.txt')
    
    // Skip if already analyzed
    if (fs.existsSync(analysisFile)) {
      console.log(`⏭️  Skipping ${img} (already analyzed)`)
      continue
    }
    
    console.log(`📄 Analyzing ${img}...`)
    const prompt = 'Analyze this web page screenshot. Describe: 1) Page type (homepage, product, collection, etc.) 2) Layout structure 3) Color scheme 4) Navigation elements 5) Content sections 6) Key visual features that must be preserved in a new implementation.'
    
    try {
      const result = await ollamaGenerate('llava:7b', prompt, imagePath)
      fs.writeFileSync(analysisFile, result)
      console.log(`   ✅ Analysis saved\n`)
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`)
    }
  }
  
  console.log('✅ Batch analysis complete')
}

async function verifySimilarity(shopifyScreenshot, newScreenshot) {
  if (!fs.existsSync(shopifyScreenshot)) {
    console.error(`Shopify screenshot not found: ${shopifyScreenshot}`)
    process.exit(1)
  }
  if (!fs.existsSync(newScreenshot)) {
    console.error(`New site screenshot not found: ${newScreenshot}`)
    process.exit(1)
  }
  
  console.log('🔍 Visual Verification')
  console.log(`   Old (Shopify): ${path.basename(shopifyScreenshot)}`)
  console.log(`   New (Self-hosted): ${path.basename(newScreenshot)}`)
  console.log('')
  
  const prompt = `Compare these two screenshots of the SAME website page. 
The first is the original Shopify version. The second is the new self-hosted version.
Analyze:
1. Are the layouts visually similar?
2. Are the same elements present in both?
3. What colors, fonts, and styling differences exist?
4. Is the product/content placement consistent?
5. Rate the visual similarity from 0-100%.
6. List specific things that need to be fixed or improved.

Be specific and actionable in your feedback.`
  
  // Analyze Shopify screenshot
  const shopifyAnalysis = await ollamaGenerate('llava:7b', 
    `[THIS IS THE ORIGINAL SHOPIFY VERSION] ${prompt}`, 
    shopifyScreenshot)
  
  console.log('📸 Original (Shopify):')
  console.log('─'.repeat(50))
  console.log(shopifyAnalysis)
  console.log('')
  
  // Analyze new screenshot  
  const newAnalysis = await ollamaGenerate('llava:7b',
    `[THIS IS THE NEW SELF-HOSTED VERSION] ${prompt}`,
    newScreenshot)
  
  console.log('📸 New (Self-hosted):')
  console.log('─'.repeat(50))
  console.log(newAnalysis)
  console.log('')
  
  // Comparison
  const comparisonPrompt = `The first image is the ORIGINAL Shopify website.
The second image is the NEW self-hosted version.

Compare them carefully and provide:
1. Visual similarity score (0-100%)
2. What matches well
3. What needs improvement
4. Specific actionable fixes for the new version`
  
  const comparison = await ollamaGenerate('llava:7b', comparisonPrompt, shopifyScreenshot)
  
  console.log('📊 Comparison:')
  console.log('─'.repeat(50))
  console.log(comparison)
}

// CLI
const command = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]

switch (command) {
  case 'analyze':
    analyzeImage(arg1, arg2)
    break
  case 'batch':
    batchAnalyze(arg1)
    break
  case 'verify':
    verifySimilarity(arg1, arg2)
    break
  case 'list-models':
    listModels()
    break
  default:
    console.log(`
Usage:
  node ollama-vision.mjs analyze <image-path> [prompt]
  node ollama-vision.mjs batch <directory>
  node ollama-vision.mjs verify <shopify-screenshot> <new-screenshot>
  node ollama-vision.mjs list-models

Default vision model: llava:7b (available locally)
    `)
}
