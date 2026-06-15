'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { LeadGateForm } from './LeadGateForm'
import { MessageList, type ChatMessage } from './MessageList'
import { ProductRecommendationCard, type ProductRec } from './ProductRecommendationCard'
import { RFQCartDrawer } from './RFQCartDrawer'
import { AppointmentPicker } from './AppointmentPicker'
import { ViberHandoff } from './ViberHandoff'
import { getQuoteCart, addToQuoteCart } from '@/components/QuoteCart'
import { getLoggedInCustomer, type CustomerProfile } from '@/lib/chatbot/customer-sync'
import './chat.css'

// ── State Machine ─────────────────────────────────────────────

type ChatState =
  | 'idle'
  | 'greeting'
  | 'lead_gate'
  | 'chat_active'
  | 'showing_products'
  | 'rfq_cart'
  | 'appointment'
  | 'viber_handoff'
  | 'submitting'
  | 'success'
  | 'error'

interface LeadData {
  name: string
  email: string
  mobile: string
  buyerType?: string
  companyName?: string
}

const VIBER_NUMBER = process.env.NEXT_PUBLIC_SALES_VIBER_NUMBER || '+639171234567'
const VIBER_NAME = process.env.NEXT_PUBLIC_SALES_VIBER_NAME || 'HomeU Sales Team'

export function ChatWidget() {
  // ── State ─────────────────────────────────────────────────
  const [state, setState] = useState<ChatState>('idle')
  const [isOpen, setIsOpen] = useState(false)
  const [leadData, setLeadData] = useState<LeadData | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<ProductRec[]>([])
  const [rfqDrawerOpen, setRfqDrawerOpen] = useState(false)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [customerLoaded, setCustomerLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const greetingDelay = parseInt(process.env.NEXT_PUBLIC_CHAT_GREETING_DELAY || '4000', 10)
  const productPageDelay = parseInt(process.env.NEXT_PUBLIC_CHAT_PRODUCT_PAGE_DELAY || '7000', 10)

  // ── Check if user is logged in ──────────────────────────────
  useEffect(() => {
    getLoggedInCustomer().then(user => {
      if (user?.id) {
        setCustomer(user)
        // Pre-fill lead data from customer profile
        setLeadData({
          name: user.name || '',
          email: user.email || '',
          mobile: user.phone || '',
        })
      }
      setCustomerLoaded(true)
    })
  }, [])

  // ── Proactive Greeting ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('homeu_chat_dismissed') === 'true') return
    if (!customerLoaded) return // Wait for customer check

    // Detect page type
    const path = window.location.pathname
    const delay = path.startsWith('/products/') ? productPageDelay : path.startsWith('/quote-cart') ? 0 : greetingDelay

    if (path.startsWith('/quote-cart')) {
      const timer = setTimeout(async () => {
        setIsOpen(true)
        // If logged-in customer on RFQ page, skip lead gate
        if (customer?.id) {
          await handleAutoLead(customer)
        } else {
          setState('lead_gate')
        }
      }, 500)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      setIsOpen(true)
      if (customer?.id) {
        // Returning customer — greet personally, skip lead gate
        setState('chat_active')
        addBotMessage(`Welcome back, ${customer.name?.split(' ')[0] || 'there'}! How can I help you with your furniture or lighting needs today?`)
        setQuickReplies(['Find a product', 'Upload a photo', 'Request quotation', 'Book showroom visit', 'View my RFQs'])
        // Create lead session (auto-linked)
        handleAutoLead(customer)
      } else {
        setState('greeting')
        addBotMessage('Hi! Looking for furniture or lighting? You can send a photo, describe what you need, or add items to your RFQ cart. Would you like help finding a product or booking a showroom visit?')
        setQuickReplies(['Find a product', 'Upload a photo', 'Request quotation', 'Book showroom visit'])
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [greetingDelay, productPageDelay, customerLoaded, customer?.id])

  // ── Auto-create lead for logged-in customers ────────────────
  const handleAutoLead = useCallback(async (cust: CustomerProfile) => {
    if (!cust?.id || leadId) return // Already have a lead session

    try {
      const res = await fetch('/api/chat/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cust.name || 'Customer',
          email: cust.email || '',
          mobile: cust.phone || '',
          customerId: cust.id,
          sourcePage: window.location.pathname,
          consent: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setLeadId(data.leadId)
        setConversationId(data.conversationId)
      }
    } catch {
      // Silent fail — chat still works without lead session
    }
  }, [leadId])

  // ── Helpers ───────────────────────────────────────────────
  let msgCounter = 0
  function nextMsgId() { return `msg-${Date.now()}-${++msgCounter}` }

  function addBotMessage(content: string) {
    setMessages(prev => [...prev, {
      id: nextMsgId(), sender: 'bot', content, type: 'text', timestamp: new Date(),
    }])
  }

  function addVisitorMessage(content: string) {
    setMessages(prev => [...prev, {
      id: nextMsgId(), sender: 'visitor', content, type: 'text', timestamp: new Date(),
    }])
  }

  function addSystemMessage(content: string) {
    setMessages(prev => [...prev, {
      id: nextMsgId(), sender: 'system' as any, content, type: 'system' as any, timestamp: new Date(),
    }])
  }

  // ── Lead Gate Submit ──────────────────────────────────────
  const handleLeadSubmit = useCallback(async (data: LeadData) => {
    setState('submitting')
    const res = await fetch('/api/chat/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        sourcePage: window.location.pathname,
        consent: true,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || 'Failed to create lead')
    }

    const result = await res.json()
    setLeadData(data)
    setLeadId(result.leadId)
    setConversationId(result.conversationId)
    addSystemMessage(`Connected as ${data.name}`)
    addBotMessage(`Thanks, ${data.name.split(' ')[0]}! How can I help you today? You can describe what you need, upload a photo, or browse our catalog.`)
    setQuickReplies(['Find a product', 'Upload a photo', 'Request quotation', 'Book showroom visit'])
    setState('chat_active')
  }, [])

  // ── Send Message ──────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !leadId) return

    addVisitorMessage(text)
    setInputValue('')
    setQuickReplies([])
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          leadId,
          message: text,
          currentPage: window.location.pathname,
        }),
      })

      if (!res.ok) throw new Error('API error')

      const data = await res.json()
      setIsTyping(false)

      if (data.reply) {
        addBotMessage(data.reply)
      }

      if (data.productRecommendations?.length > 0) {
        setRecommendations(data.productRecommendations)
        setState('showing_products')
        for (const rec of data.productRecommendations) {
          setMessages(prev => [...prev, {
            id: nextMsgId(), sender: 'bot' as any, type: 'product_card' as any,
            content: '', timestamp: new Date(),
            metadata: rec,
          }])
        }
      }

      if (data.quickReplies?.length > 0) {
        setQuickReplies(data.quickReplies)
      }

      if (data.shouldOfferViber) {
        setState('viber_handoff')
      }

      if (data.actions?.includes('OFFER_APPOINTMENT')) {
        setState('appointment')
      }
    } catch {
      setIsTyping(false)
      addBotMessage('Something went wrong. Please try again or contact our sales team.')
      setQuickReplies(['Try again', 'Contact sales on Viber'])
    }
  }, [leadId, conversationId])

  // ── Quick Reply Handler ───────────────────────────────────
  const handleQuickReply = useCallback((reply: string) => {
    switch (reply) {
      case 'Upload a photo':
      case 'Upload photo':
        handleImageUpload()
        break
      case 'Book showroom visit':
      case 'Book showroom':
      case 'Pick a date':
        setState('appointment')
        addBotMessage('Would you like to book a showroom visit? Please choose your preferred date, time, and number of visitors.')
        break
      case 'Contact sales on Viber':
      case 'Contact sales':
        setState('viber_handoff')
        break
      case 'Add to RFQ':
      case 'Add to RFQ cart':
      case 'Prepare RFQ':
        setRfqDrawerOpen(true)
        addBotMessage('You can review your RFQ cart and submit it to our sales team.')
        break
      case 'Request quotation':
        sendMessage('I would like to request a quotation')
        break
      case 'Find a product':
      case 'Describe differently':
      case 'Describe instead':
        addBotMessage('Sure! Please describe what you\'re looking for — style, material, color, or room type.')
        setTimeout(() => inputRef.current?.focus(), 100)
        break
      case 'Show more options':
        sendMessage('Show more product options')
        break
      case 'Send inquiry to admin':
        sendMessage('Please connect me with your sales team')
        break
      default:
        sendMessage(reply)
    }
  }, [sendMessage])

  // ── Image Upload ─────────────────────────────────────────
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !leadId) return

      addVisitorMessage(`📷 Uploaded: ${file.name}`)
      setIsTyping(true)

      const formData = new FormData()
      formData.append('image', file)
      formData.append('leadId', leadId)
      formData.append('conversationId', conversationId || '')

      try {
        const res = await fetch('/api/chat/upload-image', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Upload failed')

        const data = await res.json()
        setIsTyping(false)

        if (data.reply) addBotMessage(data.reply)

        if (data.recommendations?.length > 0) {
          setRecommendations(data.recommendations)
          setState('showing_products')
          for (const rec of data.recommendations) {
            setMessages(prev => [...prev, {
              id: nextMsgId(), sender: 'bot' as any, type: 'product_card' as any,
              content: '', timestamp: new Date(), metadata: rec,
            }])
          }
          setQuickReplies(['Add to RFQ cart', 'Book showroom visit'])
        } else {
          addBotMessage(`I couldn't find exact matches. Could you describe what you need?`)
          setQuickReplies(['Describe instead', 'Contact sales on Viber'])
        }
      } catch {
        setIsTyping(false)
        addBotMessage('Failed to process the image. Could you describe what you\'re looking for instead?')
      }
    }
    input.click()
  }, [leadId, conversationId])

  // ── Add to RFQ from Recommendation ──────────────────────
  const handleAddToRFQ = useCallback((product: ProductRec) => {
    addToQuoteCart({
      productId: product.productId,
      title: product.title,
      price: product.referencePrice,
      quantity: 1,
    })
    addBotMessage(`Added **${product.title}** to your RFQ cart! You can add more items or submit when ready.`)

    // Also notify server
    fetch('/api/rfq/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        conversationId,
        productId: product.productId,
        productTitle: product.title,
        quantity: 1,
        matchType: product.matchType,
      }),
    }).catch(() => {})

    setQuickReplies(['View RFQ cart', 'Add more items', 'Submit RFQ'])
  }, [leadId, conversationId])

  // ── Appointment Handlers ─────────────────────────────────
  const handleAppointmentSuccess = useCallback(() => {
    setState('success')
    addBotMessage('Thank you! Your showroom visit request has been sent. Our team will confirm your schedule.')
    setQuickReplies(['Contact sales on Viber', 'Continue browsing'])
  }, [])

  const handleAppointmentError = useCallback((err: string) => {
    setError(err)
  }, [])

  const handleAppointmentCancel = useCallback(() => {
    setState('chat_active')
    addBotMessage('No problem! Let me know if you need anything else.')
    setQuickReplies(['Find a product', 'Request quotation', 'Contact sales on Viber'])
  }, [])

  // ── Viber Handoff ────────────────────────────────────────
  const handleSendRFQToSales = useCallback(() => {
    setRfqDrawerOpen(true)
    addBotMessage('Your RFQ cart is ready for review. Submit it and our sales team will prepare a quotation.')
  }, [])

  const handleViberClose = useCallback(() => {
    setState('chat_active')
    addBotMessage('Alright! Let me know if you need anything else.')
  }, [])

  // ── Submit Message via Enter ─────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }, [inputValue, sendMessage])

  // ── Toggle Open/Close ────────────────────────────────────
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        // Opening: if returning visitor with lead data, go to chat
        if (leadId) {
          setState('chat_active')
        } else {
          setState('greeting')
          addBotMessage('Welcome back! Would you like to continue where you left off?')
          setQuickReplies(['Find a product', 'Request quotation', 'Book showroom visit'])
        }
      }
      return !prev
    })
  }, [leadId])

  // ── Render ───────────────────────────────────────────────
  const showBubble = true // Always show bubble

  return (
    <>
      {/* Floating Bubble */}
      <button className="chat-bubble" onClick={toggleChat} aria-label="Open chat" title="HomeU Concierge">
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-avatar">🏠</div>
            <div className="chat-header-info">
              <p className="chat-header-title">HomeU Concierge</p>
              <p className="chat-header-status">Furniture & Lighting Assistant</p>
            </div>
            <button className="chat-header-close" onClick={toggleChat} aria-label="Close chat">✕</button>
          </div>

          {/* Lead Gate */}
          {state === 'lead_gate' && !leadId && (
            <LeadGateForm onSubmit={handleLeadSubmit} sourcePage={typeof window !== 'undefined' ? window.location.pathname : ''} />
          )}

          {/* Chat Messages (after lead gate) */}
          {(state === 'chat_active' || state === 'showing_products' || state === 'greeting' || state === 'submitting' || state === 'success' || state === 'error') && leadId && (
            <>
              <MessageList messages={messages} isTyping={isTyping} />

              {/* Product Recommendations */}
              {recommendations.length > 0 && state === 'showing_products' && (
                <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', flexShrink: 0 }}>
                  {recommendations.map(rec => (
                    <ProductRecommendationCard key={rec.productId} product={rec} onAddToRFQ={handleAddToRFQ} />
                  ))}
                </div>
              )}

              {/* Quick Replies */}
              {quickReplies.length > 0 && (
                <div className="chat-quick-replies">
                  {quickReplies.map(reply => (
                    <button key={reply} className="chat-quick-reply-btn" onClick={() => handleQuickReply(reply)}>
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Success State */}
              {state === 'success' && (
                <div className="chat-success">
                  <div className="chat-success-icon">✅</div>
                  <h3>All Set!</h3>
                  <p>Your request has been sent to our team. We'll get back to you shortly.</p>
                  <button className="chat-success-btn" onClick={() => { setState('chat_active'); setQuickReplies(['Browse products', 'Contact sales on Viber']) }}>
                    Continue
                  </button>
                </div>
              )}

              {/* Input Area */}
              <div className="chat-input-area">
                <button className="chat-upload-btn" onClick={handleImageUpload} title="Upload image" aria-label="Upload image">
                  📷
                </button>
                <input
                  ref={inputRef}
                  className="chat-input"
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={state === 'submitting'}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || state === 'submitting'}
                  aria-label="Send message"
                >
                  ➤
                </button>
              </div>
            </>
          )}

          {/* Chat State without lead (greeting first) */}
          {state === 'greeting' && !leadId && (
            <>
              <MessageList messages={messages} isTyping={false} />
              {quickReplies.length > 0 && (
                <div className="chat-quick-replies">
                  {quickReplies.map(reply => (
                    <button key={reply} className="chat-quick-reply-btn" onClick={() => {
                      if (reply === 'Upload a photo' || reply === 'Find a product' || reply === 'Request quotation' || reply === 'Book showroom visit') {
                        setState('lead_gate')
                      } else {
                        handleQuickReply(reply)
                      }
                    }}>
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Appointment Picker */}
          {state === 'appointment' && leadId && (
            <AppointmentPicker
              leadId={leadId}
              conversationId={conversationId || ''}
              onSuccess={handleAppointmentSuccess}
              onError={handleAppointmentError}
              onCancel={handleAppointmentCancel}
            />
          )}

          {/* Viber Handoff */}
          {state === 'viber_handoff' && (
            <div style={{ padding: 16, flexShrink: 0 }}>
              <ViberHandoff
                viberNumber={VIBER_NUMBER}
                viberName={VIBER_NAME}
                onSendRFQ={handleSendRFQToSales}
                onClose={handleViberClose}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 16px', background: '#fff4f2', color: '#d93025', fontSize: 13, textAlign: 'center' }}>
              {error}
              <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* RFQ Cart Drawer (global overlay) */}
      <RFQCartDrawer isOpen={rfqDrawerOpen} onClose={() => setRfqDrawerOpen(false)} />
    </>
  )
}
