/**
 * POST /api/chat/upload-image
 *
 * Accepts an image upload from a visitor, stores it,
 * analyzes it with AI vision, and recommends matching products.
 *
 * Accepts: multipart/form-data with fields: conversationId, leadId, image
 * Response: { imageId, description, extractedAttributes, recommendations }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/chatbot/ai-provider'
import { searchByAttributes } from '@/lib/chatbot/product-search'
import { imageUploadReply, productRecommendationReply } from '@/lib/chatbot/prompts'
import { createSignal } from '@/lib/chatbot/lead-scorer'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const conversationId = formData.get('conversationId') as string
    const leadId = formData.get('leadId') as string
    const image = formData.get('image') as File | null

    if (!image) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are accepted' }, { status: 400 })
    }

    // Validate file size
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })
    }

    // Persist the uploaded file to disk so AI providers can fetch it
    const imageId = crypto.randomUUID?.() || `img-${Date.now()}`
    const ext = image.name.split('.').pop() || 'jpg'
    const fileName = `${imageId}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat')
    const filePath = path.join(uploadDir, fileName)

    await mkdir(uploadDir, { recursive: true })
    const bytes = await image.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Build an absolute URL the AI provider can reach
    const origin = request.nextUrl.origin
    const imageUrl = `${origin}/uploads/chat/${fileName}`

    console.log(`[chatbot] Image uploaded:`, {
      imageId,
      fileName,
      fileSize: image.size,
      mimeType: image.type,
      imageUrl,
      conversationId,
      leadId,
    })

    // Analyze image with AI vision
    let description = 'a furniture or lighting item'
    let extractedAttributes: Record<string, unknown> = {}

    try {
      const ai = getAIProvider()
      const analysisPrompt = `Describe this furniture or lighting item in detail. Extract: category, style, material, color, shape, and usage. Format as JSON.`
      const analysis = await ai.analyzeImage(imageUrl, analysisPrompt, AbortSignal.timeout(15000))

      // Try to parse structured JSON from the analysis
      const jsonMatch = analysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          extractedAttributes = JSON.parse(jsonMatch[0])
        } catch {
          extractedAttributes = {}
        }
      }
      description = analysis.replace(/\{[\s\S]*\}/, '').trim() || description
    } catch {
      // Vision analysis failed — use text fallback
      description = 'a furniture or lighting item (vision analysis unavailable)'
      extractedAttributes = {}
    }

    // Search for matching products
    const recommendations = await searchByAttributes({
      category: extractedAttributes?.category as string | undefined,
      style: extractedAttributes?.style as string[] | undefined,
      material: extractedAttributes?.material as string[] | undefined,
      color: extractedAttributes?.color as string[] | undefined,
    })

    const formattedRecs = recommendations.map(r => ({
      productId: r.id,
      title: r.title,
      url: r.url,
      imageUrl: r.imageUrl,
      referencePrice: r.price,
      reason: r.matchReason,
      matchType: r.matchType,
      confidence: r.confidence,
    }))

    const reply = imageUploadReply(description)

    return NextResponse.json({
      imageId,
      description,
      extractedAttributes,
      reply,
      recommendations: formattedRecs,
    })
  } catch (err) {
    console.error('[chatbot] POST /api/chat/upload-image error:', err)
    return NextResponse.json({
      error: 'Failed to process image',
      description: 'Unable to analyze the image. Please try describing what you need instead.',
    }, { status: 500 })
  }
}
