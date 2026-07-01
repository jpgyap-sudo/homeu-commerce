/**
 * POST /api/chat/message
 *
 * Main chat endpoint. Receives a visitor message, classifies intent,
 * generates bot reply, and returns recommendations if applicable.
 *
 * Request body:
 *   { conversationId, leadId, message, currentPage? }
 *
 * Response:
 *   { reply, actions, productRecommendations, quickReplies, intent }
 */

import { NextRequest, NextResponse } from 'next/server'
import { classifyIntent } from '@/lib/chatbot/intent-classifier'
import { getAIProvider } from '@/lib/chatbot/ai-provider'
import { searchProducts } from '@/lib/chatbot/product-search'
import {
  SYSTEM_PROMPT, GREETING_HOMEPAGE, GREETING_PRODUCT_PAGE,
  productRecommendationReply, PRICE_DISCLAIMER, fallbackMessage,
  RFQ_QUANTITY_QUESTION, APPOINTMENT_MESSAGE, ERROR_AI_TIMEOUT, ERROR_GENERIC,
} from '@/lib/chatbot/prompts'
import { insertLedgerEvent, insertMessage, updateConversationIntent } from '@/lib/chatbot/db'
import { sendTelegramAlert } from '@/lib/chatbot/telegram-client'
import { loadNamespace } from '@/lib/app-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, leadId, message, currentPage } = body

    const messaging = await loadNamespace<{ viberNumber: string }>('messaging')
    const VIBER_NUMBER = messaging.viberNumber || ''

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Detect greeting for special handling
    const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|kamusta|maayong)\b/i.test(message.trim())

    if (isGreeting) {
      const greeting = currentPage?.includes('/products/')
        ? GREETING_PRODUCT_PAGE
        : currentPage?.includes('/quote-cart') || currentPage?.includes('/rfq')
          ? GREETING_HOMEPAGE // simplified
          : GREETING_HOMEPAGE

      if (conversationId) {
        try {
          await insertMessage({
            conversationId,
            senderType: 'visitor',
            content: message.trim(),
            messageType: 'text',
            metadata: { intent: 'GREETING', currentPage },
          })
          if (leadId) {
            await insertLedgerEvent({
              leadId,
              conversationId,
              eventType: 'message_sent',
              eventData: { intent: 'GREETING', currentPage, preview: message.trim().slice(0, 120) },
              scoreDelta: 2,
            }).catch(() => '')
          }
          await updateConversationIntent(conversationId, 'GREETING', 1)
        } catch (err: any) {
          console.error('[chatbot] Failed to persist greeting visitor message:', err.message)
          return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
        }
      }

      return NextResponse.json({
        reply: greeting,
        actions: ['GREET'],
        productRecommendations: [],
        quickReplies: [
          'Find a product', 'Upload a photo', 'Request quotation',
          'Book showroom visit', 'Contact sales on Viber',
        ],
        intent: 'GREETING',
      })
    }

    // Classify intent
    const classified = await classifyIntent(message, currentPage)

    // Process based on intent
    let reply = ''
    let productRecommendations: any[] = []
    const quickReplies: string[] = []
    const actions: string[] = [classified.nextAction]

    switch (classified.intent) {
      case 'PRODUCT_SEARCH': {
        const results = await searchProducts({
          query: message,
          category: classified.extractedEntities.category,
          style: classified.extractedEntities.style,
          material: classified.extractedEntities.material,
          color: classified.extractedEntities.color,
          limit: 6,
        })

        if (results.length > 0) {
          productRecommendations = results.map(r => ({
            productId: r.id,
            title: r.title,
            url: r.url,
            imageUrl: r.imageUrl,
            referencePrice: r.price,
            reason: r.matchReason,
            matchType: r.matchType,
            confidence: r.confidence,
          }))
          reply = productRecommendationReply(results.map(r => ({
            title: r.title, url: r.url, reason: r.matchReason, matchType: r.matchType, referencePrice: r.price,
          })))
          actions.push('SHOW_PRODUCTS')
          quickReplies.push('Add to RFQ', 'Show more options', 'Book showroom visit')
        } else {
          reply = `I couldn't find exact matches in our catalog. Could you tell me more about what you're looking for? Style, material, or color preferences?`
          actions.push('ASK_CLARIFYING_QUESTION')
          quickReplies.push('Describe differently', 'Contact sales on Viber')
        }
        break
      }

      case 'IMAGE_MATCH': {
        reply = `I'd be happy to help find products similar to what you're looking for. Please upload a photo of the item.`
        actions.push('REQUEST_IMAGE')
        quickReplies.push('Upload photo', 'Describe instead')
        break
      }

      case 'RFQ_REQUEST': {
        const quantity = classified.extractedEntities.quantity
        const location = classified.extractedEntities.location

        if (!quantity) {
          reply = RFQ_QUANTITY_QUESTION
          actions.push('ASK_QUANTITY')
        } else if (!location) {
          reply = `How many pieces do you need, and where is the delivery location?`
          actions.push('ASK_LOCATION')
        } else {
          // Search for matching products
          const results = await searchProducts({
            query: message,
            category: classified.extractedEntities.category,
            limit: 4,
          })
          if (results.length > 0) {
            productRecommendations = results.map(r => ({
              productId: r.id, title: r.title, url: r.url, imageUrl: r.imageUrl,
              referencePrice: r.price, reason: r.matchReason, matchType: r.matchType,
            }))
            reply = `I can help with that! Here are some products that might work:\n${productRecommendationReply(results.map(r => ({
              title: r.title, url: r.url, reason: r.matchReason, matchType: r.matchType, referencePrice: r.price,
            })))}`
            actions.push('SHOW_PRODUCTS', 'ADD_TO_RFQ_CART')
          } else {
            reply = `I understand you need ${quantity} pieces for ${location}. Let me search our catalog. Could you tell me more about the style you're looking for?`
            actions.push('ASK_CLARIFYING_QUESTION')
          }
          quickReplies.push('Add to RFQ cart', 'Request quotation', 'Book showroom visit')
        }
        break
      }

      case 'APPOINTMENT_REQUEST': {
        reply = APPOINTMENT_MESSAGE
        actions.push('OFFER_APPOINTMENT')
        quickReplies.push('Pick a date', 'Contact sales on Viber')
        break
      }

      case 'PRICE_QUESTION':
      case 'AVAILABILITY_QUESTION':
      case 'DELIVERY_QUESTION': {
        reply = `${PRICE_DISCLAIMER}\n\nWould you like to add items to an RFQ cart so our sales team can provide a quotation?`
        actions.push('ANSWER_FAQ', 'OFFER_RFQ')
        quickReplies.push('Add to RFQ cart', 'Contact sales on Viber')
        break
      }

      case 'SALES_HANDOFF': {
        reply = `You can reach our sales team on Viber: ${VIBER_NUMBER}\n\nWould you also like me to prepare an RFQ for you before you call?`
        actions.push('OFFER_VIBER', 'OFFER_RFQ')
        quickReplies.push('Prepare RFQ', 'Book showroom visit')
        // ── Telegram Alert ────────────────────────────────────────
        sendTelegramAlert({
          eventType: 'ESCALATION',
          leadId: leadId || '',
          conversationId: conversationId || '',
          leadName: leadId || '',
          mobile: '',
          summary: `Visitor requested Viber handoff: "${message.trim().substring(0, 100)}"`,
        }).catch(() => {})
        break
      }

      case 'COMPLAINT':
      case 'CUSTOM_FURNITURE': {
        reply = `I understand. Let me connect you with our sales team who can assist you personally.`
        actions.push('ESCALATE_HUMAN')
        quickReplies.push('Contact sales on Viber', 'Send inquiry to admin')
        // ── Telegram Alert ────────────────────────────────────────
        sendTelegramAlert({
          eventType: 'ESCALATION',
          leadId: leadId || '',
          conversationId: conversationId || '',
          leadName: leadId || '',
          mobile: '',
          summary: `Visitor escalated: "${classified.intent}" — "${message.trim().substring(0, 100)}"`,
        }).catch(() => {})
        break
      }

      case 'FAQ': {
        try {
          const ai = await getAIProvider()
          reply = await ai.generateText(
            `Answer this question about HomeU.PH furniture store: "${message}". Be concise and helpful. Mention that prices are for reference only.`,
            SYSTEM_PROMPT,
            AbortSignal.timeout(8000)
          )
        } catch {
          reply = `That's a great question. Please note that prices shown are for reference only. For specific details, please contact our sales team on Viber: ${VIBER_NUMBER}`
        }
        actions.push('ANSWER_FAQ')
        quickReplies.push('Ask another question', 'Request quotation')
        break
      }

      default: {
        // UNKNOWN — use AI to generate a reply
        try {
          const ai = await getAIProvider()
          reply = await ai.generateText(
            `Visitor says: "${message}"\n\nCurrent page: ${currentPage || 'homepage'}\n\nRespond helpfully as a furniture/home chatbot. If unsure, offer Viber handoff. Be warm and professional.`,
            SYSTEM_PROMPT,
            AbortSignal.timeout(8000)
          )
        } catch {
          reply = fallbackMessage(VIBER_NUMBER)
        }
        actions.push('FALLBACK')
        quickReplies.push('Find a product', 'Request quotation', 'Book showroom visit', 'Contact sales on Viber')
        break
      }
    }

    // ── Persist messages to PostgreSQL ───────────────────────
    if (conversationId) {
      try {
        // Persist visitor message — required; fail loudly if this doesn't save
        await insertMessage({
          conversationId,
          senderType: 'visitor',
          content: message.trim(),
          messageType: 'text',
          metadata: { intent: classified.intent, currentPage },
        })
        if (leadId) {
          await insertLedgerEvent({
            leadId,
            conversationId,
            eventType: 'message_sent',
            eventData: { intent: classified.intent, currentPage, preview: message.trim().slice(0, 120) },
            scoreDelta: 2,
          }).catch(() => '')
        }
        await updateConversationIntent(conversationId, classified.intent, classified.confidence)
      } catch (err: any) {
        console.error('[chatbot] Failed to persist visitor message:', err.message)
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
      }

      // Persist bot reply — best-effort since the visitor message was already saved
      try {
        await insertMessage({
          conversationId,
          senderType: 'bot',
          content: reply,
          messageType: 'text',
          metadata: {
            actions,
            intent: classified.intent,
            productRecommendations: productRecommendations.length > 0 ? productRecommendations.map(r => r.productId) : undefined,
            quickReplies,
          },
        })
      } catch (err: any) {
        console.error('[chatbot] Failed to persist bot reply:', err.message)
        // non-fatal — visitor message was saved
      }
    }

    return NextResponse.json({
      reply,
      actions,
      productRecommendations,
      quickReplies,
      intent: classified.intent,
      confidence: classified.confidence,
      shouldEscalate: classified.shouldEscalate,
      shouldOfferViber: classified.shouldOfferViber,
    })
  } catch (err) {
    console.error('[chatbot] POST /api/chat/message error:', err)
    return NextResponse.json({
      reply: ERROR_GENERIC,
      actions: ['FALLBACK'],
      productRecommendations: [],
      quickReplies: ['Try again', 'Contact sales on Viber'],
      intent: 'ERROR',
    })
  }
}
